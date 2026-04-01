import { Router, type Request, type Response } from "express";
import { executeCodex } from "../adapters/codex.js";
import { store } from "../db/store.js";
import type { AppContext, CodexAdapterConfig } from "../types.js";

const DEFAULT_MODEL = "gpt-5.4-codex";
const DEFAULT_TIMEOUT_SEC = 300;

function parseConfig(input: unknown): CodexAdapterConfig {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {};
  }

  const record = input as Record<string, unknown>;
  const env =
    typeof record.env === "object" && record.env !== null && !Array.isArray(record.env)
      ? Object.fromEntries(
          Object.entries(record.env).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : undefined;

  return {
    model: typeof record.model === "string" ? record.model : undefined,
    cwd: typeof record.cwd === "string" ? record.cwd : undefined,
    fullAuto: typeof record.fullAuto === "boolean" ? record.fullAuto : undefined,
    timeoutSec: typeof record.timeoutSec === "number" ? record.timeoutSec : undefined,
    env,
  };
}

function mergeConfig(base: CodexAdapterConfig, override: CodexAdapterConfig): CodexAdapterConfig {
  return {
    model: override.model ?? base.model ?? DEFAULT_MODEL,
    cwd: override.cwd ?? base.cwd,
    fullAuto: override.fullAuto ?? base.fullAuto ?? true,
    timeoutSec: override.timeoutSec ?? base.timeoutSec ?? DEFAULT_TIMEOUT_SEC,
    env: {
      ...(base.env ?? {}),
      ...(override.env ?? {}),
    },
  };
}

function buildPrompt(agentPrompt: string, message: string) {
  const sections = [
    agentPrompt.trim(),
    "以降はユーザーとのチャットです。日本語で回答し、必要なときだけコードブロックを使ってください。",
    `ユーザーメッセージ:\n${message.trim()}`,
  ].filter(Boolean);
  return sections.join("\n\n");
}

async function startRun(
  context: AppContext,
  input: {
    agentId: string;
    agentPrompt: string;
    baseConfig: CodexAdapterConfig;
    message: string;
    runId: string;
  },
) {
  const effectiveConfig = {
    model: input.baseConfig.model ?? DEFAULT_MODEL,
    cwd: input.baseConfig.cwd,
    fullAuto: input.baseConfig.fullAuto ?? true,
    timeoutSec: input.baseConfig.timeoutSec ?? DEFAULT_TIMEOUT_SEC,
    env: input.baseConfig.env ?? {},
  };

  const runningRun = store.updateRun(context.db, input.runId, {
    status: "running",
    model: effectiveConfig.model,
    cwd: effectiveConfig.cwd ?? null,
    startedAt: new Date().toISOString(),
  });

  context.sse.broadcast({
    type: "run:started",
    payload: {
      agentId: input.agentId,
      run: runningRun,
    },
  });

  const result = await executeCodex({
    prompt: buildPrompt(input.agentPrompt, input.message),
    config: effectiveConfig,
    onOutput: async (event) => {
      context.sse.broadcast({
        type: "run:output",
        payload: {
          agentId: input.agentId,
          runId: input.runId,
          ...event,
        },
      });
    },
  }).catch((error: Error) => ({
    status: "failed" as const,
    output: "",
    exitCode: null,
    signal: null,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    model: effectiveConfig.model ?? DEFAULT_MODEL,
    cwd: effectiveConfig.cwd ?? process.cwd(),
    timedOut: false,
    errorMessage: error.message,
  }));

  const finalOutput = result.output.trim() || result.errorMessage || "応答を取得できませんでした。";
  const status = result.status === "completed" ? "completed" : "failed";
  const savedRun = store.updateRun(context.db, input.runId, {
    status,
    output: finalOutput,
    exitCode: result.exitCode,
    model: result.model,
    cwd: result.cwd,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
  });

  const assistantMessage = store.addChatMessage(context.db, {
    agentId: input.agentId,
    runId: input.runId,
    role: "assistant",
    content: finalOutput,
  });

  context.sse.broadcast({
    type: "chat:message",
    payload: {
      agentId: input.agentId,
      message: assistantMessage,
    },
  });

  context.sse.broadcast({
    type: "run:complete",
    payload: {
      agentId: input.agentId,
      run: savedRun,
      message: assistantMessage,
    },
  });
}

export function chatRoutes(context: AppContext) {
  const router = Router();

  const handleChatRequest = (req: Request<{ agentId: string }>, res: Response) => {
    const agentId = req.params.agentId;
    const agent = store.getAgent(context.db, agentId);
    if (!agent) {
      res.status(404).json({ message: "エージェントが見つかりません。" });
      return;
    }

    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      res.status(400).json({ message: "メッセージを入力してください。" });
      return;
    }

    const overrideConfig = parseConfig(req.body?.config);
    const effectiveConfig = mergeConfig(agent.adapterConfig, overrideConfig);
    const userMessage = store.addChatMessage(context.db, {
      agentId: agent.id,
      role: "user",
      content: message,
    });
    const run = store.createRun(context.db, {
      agentId: agent.id,
      prompt: message,
      model: effectiveConfig.model ?? DEFAULT_MODEL,
      cwd: effectiveConfig.cwd ?? null,
      status: "pending",
    });

    context.sse.broadcast({
      type: "chat:message",
      payload: {
        agentId: agent.id,
        message: userMessage,
      },
    });

    res.status(202).json({
      run,
      message: userMessage,
    });

    if (!run) return;

    void startRun(context, {
      agentId: agent.id,
      agentPrompt: agent.prompt,
      baseConfig: effectiveConfig,
      message,
      runId: run.id,
    });
  };

  router.get("/agents/:agentId/chat", (req, res) => {
    const agent = store.getAgent(context.db, req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: "エージェントが見つかりません。" });
      return;
    }

    res.json(store.getAgentChat(context.db, req.params.agentId));
  });

  router.post("/agents/:agentId/chat", handleChatRequest);
  router.post("/agents/:agentId/run", handleChatRequest);

  router.get("/agents/:agentId/runs", (req, res) => {
    const agent = store.getAgent(context.db, req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: "エージェントが見つかりません。" });
      return;
    }

    res.json({ runs: store.listAgentRuns(context.db, req.params.agentId) });
  });

  router.get("/agents/:agentId/runs/:runId", (req, res) => {
    const run = store.getRun(context.db, req.params.agentId, req.params.runId);
    if (!run) {
      res.status(404).json({ message: "実行履歴が見つかりません。" });
      return;
    }

    res.json({ run });
  });

  return router;
}
