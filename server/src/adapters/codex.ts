import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type { CodexAdapterConfig } from "../types.js";
import { registerProcess } from "../services/process-registry.js";

// Windows では codex.cmd のフルパスを使用してPATH問題を回避
const CODEX_BIN =
  os.platform() === "win32"
    ? path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "npm",
        "codex.cmd",
      )
    : "codex";

const ANSI_ESCAPE_RE = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const DEFAULT_MODEL = "gpt-5.4";
const DEFAULT_TIMEOUT_SEC = 300;

export interface CodexOutputEvent {
  stream: "stdout" | "stderr";
  line: string;
  at: string;
}

export interface CodexExecutionResult {
  status: "completed" | "failed";
  output: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  startedAt: string;
  finishedAt: string;
  model: string;
  cwd: string;
  timedOut: boolean;
  errorMessage: string | null;
}

type ExecuteCodexOptions = {
  prompt: string;
  runId?: string;
  config?: CodexAdapterConfig;
  onOutput?: (event: CodexOutputEvent) => void | Promise<void>;
  onSpawn?: (meta: { pid: number; startedAt: string; model: string; cwd: string }) => void | Promise<void>;
};

function cleanLine(value: string) {
  return value.replace(ANSI_ESCAPE_RE, "").replace(/\r/g, "").trimEnd();
}

async function flushBuffer(
  state: { buffer: string; lines: string[] },
  stream: "stdout" | "stderr",
  onOutput?: ExecuteCodexOptions["onOutput"],
) {
  const parts = state.buffer.split("\n");
  state.buffer = parts.pop() ?? "";

  for (const part of parts) {
    const line = cleanLine(part);
    if (!line) continue;
    state.lines.push(line);
    await onOutput?.({
      stream,
      line,
      at: new Date().toISOString(),
    });
  }
}

export async function executeCodex(options: ExecuteCodexOptions): Promise<CodexExecutionResult> {
  const prompt = options.prompt.trim();
  const model = options.config?.model?.trim() || DEFAULT_MODEL;
  const cwd = path.resolve(options.config?.cwd?.trim() || process.cwd());
  const fullAuto = options.config?.fullAuto ?? true;
  const timeoutSec = options.config?.timeoutSec ?? DEFAULT_TIMEOUT_SEC;
  const startedAt = new Date().toISOString();
  // Use "-" so prompt is read from stdin (avoids Windows CLI encoding issues with Japanese)
  const args = ["exec", "-", "--model", model];

  if (fullAuto) {
    args.push("--full-auto");
  }

  const env = {
    ...process.env,
    ...(options.config?.env ?? {}),
  };

  return await new Promise<CodexExecutionResult>((resolve) => {
    const stdoutState = { buffer: "", lines: [] as string[] };
    const stderrState = { buffer: "", lines: [] as string[] };
    let finished = false;
    let timedOut = false;

    const child = spawn(CODEX_BIN, args, {
      cwd,
      env,
      shell: true,
      windowsHide: true,
    });

    if (options.runId) registerProcess(options.runId, child);

    // Write prompt to stdin and close it
    if (child.stdin) {
      child.stdin.write(prompt);
      child.stdin.end();
    }

    const complete = async (payload: Omit<CodexExecutionResult, "output">) => {
      if (finished) return;
      finished = true;

      for (const state of [stdoutState, stderrState]) {
        const pending = cleanLine(state.buffer);
        if (pending) {
          state.lines.push(pending);
          await options.onOutput?.({
            stream: state === stdoutState ? "stdout" : "stderr",
            line: pending,
            at: new Date().toISOString(),
          });
        }
      }

      const output = [...stdoutState.lines, ...stderrState.lines].join("\n").trim();
      resolve({
        ...payload,
        output,
      });
    };

    void options.onSpawn?.({
      pid: child.pid ?? -1,
      startedAt,
      model,
      cwd,
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutSec * 1000);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutState.buffer += chunk.toString();
      void flushBuffer(stdoutState, "stdout", options.onOutput);
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderrState.buffer += chunk.toString();
      void flushBuffer(stderrState, "stderr", options.onOutput);
    });

    child.once("error", (error) => {
      clearTimeout(timer);
      void complete({
        status: "failed",
        exitCode: null,
        signal: null,
        startedAt,
        finishedAt: new Date().toISOString(),
        model,
        cwd,
        timedOut,
        errorMessage: error.message,
      });
    });

    child.once("close", (code, signal) => {
      clearTimeout(timer);
      void complete({
        status: timedOut || code !== 0 ? "failed" : "completed",
        exitCode: code,
        signal,
        startedAt,
        finishedAt: new Date().toISOString(),
        model,
        cwd,
        timedOut,
        errorMessage: timedOut ? `タイムアウトしました（${timeoutSec}秒）` : code === 0 ? null : "Codex の実行に失敗しました。",
      });
    });
  });
}
