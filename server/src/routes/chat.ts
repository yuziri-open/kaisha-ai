import { Router, type Request, type Response } from "express";
import { executeCodex } from "../adapters/codex.js";
import { executeClaude } from "../adapters/claude.js";
import { cancelProcess } from "../services/process-registry.js";
import { store } from "../db/store.js";
import type { AppContext, CodexAdapterConfig, ClaudeAdapterConfig } from "../types.js";

const DEFAULT_CODEX_MODEL = "gpt-5.4";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_TIMEOUT_SEC = 300;
const DEFAULT_CLAUDE_TIMEOUT_SEC = 600;

function parseCodexConfig(input: unknown): CodexAdapterConfig {
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

function parseClaudeConfig(input: unknown): ClaudeAdapterConfig {
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
    maxTurns: typeof record.maxTurns === "number" ? record.maxTurns : undefined,
    timeoutSec: typeof record.timeoutSec === "number" ? record.timeoutSec : undefined,
    env,
  };
}

function mergeCodexConfig(base: CodexAdapterConfig, override: CodexAdapterConfig): CodexAdapterConfig {
  return {
    model: override.model ?? base.model ?? DEFAULT_CODEX_MODEL,
    cwd: override.cwd ?? base.cwd,
    fullAuto: override.fullAuto ?? base.fullAuto ?? true,
    timeoutSec: override.timeoutSec ?? base.timeoutSec ?? DEFAULT_TIMEOUT_SEC,
    env: {
      ...(base.env ?? {}),
      ...(override.env ?? {}),
    },
  };
}

function mergeClaudeConfig(base: ClaudeAdapterConfig, override: ClaudeAdapterConfig): ClaudeAdapterConfig {
  return {
    model: override.model ?? base.model ?? DEFAULT_CLAUDE_MODEL,
    cwd: override.cwd ?? base.cwd,
    maxTurns: override.maxTurns ?? base.maxTurns ?? 10,
    timeoutSec: override.timeoutSec ?? base.timeoutSec ?? DEFAULT_CLAUDE_TIMEOUT_SEC,
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
    adapterType: string;
    agentPrompt: string;
    baseConfig: CodexAdapterConfig | ClaudeAdapterConfig;
    message: string;
    runId: string;
  },
) {
  const isClaudeAdapter = input.adapterType === "Claude Code";
  const defaultModel = isClaudeAdapter ? DEFAULT_CLAUDE_MODEL : DEFAULT_CODEX_MODEL;
  const defaultTimeout = isClaudeAdapter ? DEFAULT_CLAUDE_TIMEOUT_SEC : DEFAULT_TIMEOUT_SEC;

  const effectiveConfig = {
    model: input.baseConfig.model ?? defaultModel,
    cwd: input.baseConfig.cwd,
    timeoutSec: input.baseConfig.timeoutSec ?? defaultTimeout,
    env: input.baseConfig.env ?? {},
    ...(isClaudeAdapter
      ? { maxTurns: (input.baseConfig as ClaudeAdapterConfig).maxTurns ?? 10 }
      : { fullAuto: (input.baseConfig as CodexAdapterConfig).fullAuto ?? true }),
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

  const onOutput = async (event: { stream: string; line: string; at: string }) => {
    context.sse.broadcast({
      type: "run:output",
      payload: {
        agentId: input.agentId,
        runId: input.runId,
        ...event,
      },
    });
  };

  const fullPrompt = buildPrompt(input.agentPrompt, input.message);

  const executeAdapter = isClaudeAdapter
    ? executeClaude({
        prompt: fullPrompt,
        runId: input.runId,
        config: effectiveConfig as ClaudeAdapterConfig,
        onOutput,
      })
    : executeCodex({
        prompt: fullPrompt,
        runId: input.runId,
        config: effectiveConfig as CodexAdapterConfig,
        onOutput,
      });

  const result = await executeAdapter.catch((error: Error) => ({
    status: "failed" as const,
    output: "",
    exitCode: null,
    signal: null,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    model: effectiveConfig.model ?? defaultModel,
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

    const adapterType = agent.adapterType || "Codex";
    const isClaudeAdapter = adapterType === "Claude Code";

    const effectiveConfig = isClaudeAdapter
      ? mergeClaudeConfig(
          agent.adapterConfig as ClaudeAdapterConfig,
          parseClaudeConfig(req.body?.config),
        )
      : mergeCodexConfig(
          agent.adapterConfig as CodexAdapterConfig,
          parseCodexConfig(req.body?.config),
        );
    const userMessage = store.addChatMessage(context.db, {
      agentId: agent.id,
      role: "user",
      content: message,
    });
    const defaultModel = isClaudeAdapter ? DEFAULT_CLAUDE_MODEL : DEFAULT_CODEX_MODEL;
    const run = store.createRun(context.db, {
      agentId: agent.id,
      prompt: message,
      model: effectiveConfig.model ?? defaultModel,
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
      adapterType,
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

  router.post("/agents/:agentId/runs/:runId/cancel", (req, res) => {
    const agent = store.getAgent(context.db, req.params.agentId);
    if (!agent) {
      res.status(404).json({ message: "エージェントが見つかりません。" });
      return;
    }

    const run = store.getRun(context.db, req.params.agentId, req.params.runId);
    if (!run) {
      res.status(404).json({ message: "実行履歴が見つかりません。" });
      return;
    }

    const killed = cancelProcess(req.params.runId);
    if (!killed && (run.status === "running" || run.status === "pending")) {
      store.updateRun(context.db, req.params.runId, {
        status: "failed",
        output: "ユーザーによりキャンセルされました。",
        finishedAt: new Date().toISOString(),
      });
    }

    context.sse.broadcast({
      type: "run:complete",
      payload: {
        agentId: req.params.agentId,
        run: store.getRun(context.db, req.params.agentId, req.params.runId),
      },
    });

    res.json({ cancelled: true });
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
