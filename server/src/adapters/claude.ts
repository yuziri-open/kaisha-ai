import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import type { ClaudeAdapterConfig } from "../types.js";
import type { CodexExecutionResult, CodexOutputEvent } from "./codex.js";
import { registerProcess } from "../services/process-registry.js";

// Windows では claude.exe のフルパスを使用してPATH問題を回避
const CLAUDE_BIN =
  os.platform() === "win32"
    ? path.join(
        os.homedir(),
        ".local",
        "bin",
        "claude.exe",
      )
    : "claude";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_TIMEOUT_SEC = 600;
const DEFAULT_MAX_TURNS = 10;

type ExecuteClaudeOptions = {
  prompt: string;
  runId?: string;
  config?: ClaudeAdapterConfig;
  onOutput?: (event: CodexOutputEvent) => void | Promise<void>;
  onSpawn?: (meta: { pid: number; startedAt: string; model: string; cwd: string }) => void | Promise<void>;
};

/**
 * stream-json の各行をパースして assistant テキストを抽出する。
 *
 * 形式:
 *   { type: "system", ... }           → session_id, model 等のメタ情報
 *   { type: "assistant", message: { content: [{ type: "text", text: "..." }] } }
 *   { type: "result", result: "...", cost_usd: ..., usage: ... }
 */
function extractTextFromStreamLine(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const obj = json as Record<string, unknown>;

  if (obj.type === "assistant") {
    const message = obj.message as Record<string, unknown> | undefined;
    if (!message) return null;
    const content = message.content as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(content)) return null;
    const texts: string[] = [];
    for (const block of content) {
      if (block.type === "text" && typeof block.text === "string") {
        texts.push(block.text);
      }
    }
    return texts.length > 0 ? texts.join("") : null;
  }

  if (obj.type === "result") {
    if (typeof obj.result === "string") return obj.result;
  }

  return null;
}

export async function executeClaude(options: ExecuteClaudeOptions): Promise<CodexExecutionResult> {
  const prompt = options.prompt.trim();
  const model = options.config?.model?.trim() || DEFAULT_MODEL;
  const cwd = path.resolve(options.config?.cwd?.trim() || process.cwd());
  const maxTurns = options.config?.maxTurns ?? DEFAULT_MAX_TURNS;
  const timeoutSec = options.config?.timeoutSec ?? DEFAULT_TIMEOUT_SEC;
  const startedAt = new Date().toISOString();

  const args = [
    "--print", "-",
    "--output-format", "stream-json",
    "--verbose",
    "--permission-mode", "bypassPermissions",
    "--model", model,
    "--max-turns", String(maxTurns),
  ];

  const env = {
    ...process.env,
    ...(options.config?.env ?? {}),
  };

  return await new Promise<CodexExecutionResult>((resolve) => {
    const collectedTexts: string[] = [];
    let stderrBuffer = "";
    const stderrLines: string[] = [];
    let stdoutBuffer = "";
    let finished = false;
    let timedOut = false;
    let lastResultText: string | null = null;

    const child = spawn(CLAUDE_BIN, args, {
      cwd,
      env,
      shell: true,
      windowsHide: true,
    });

    if (options.runId) registerProcess(options.runId, child);

    const complete = async (payload: Omit<CodexExecutionResult, "output">) => {
      if (finished) return;
      finished = true;

      // 最終出力: result タイプがあればそちらを優先、なければ assistant テキストを結合
      const output = lastResultText ?? (collectedTexts.join("") || stderrLines.join("\n"));
      resolve({
        ...payload,
        output: output.trim(),
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

    // stdin にプロンプトを書き込んで close
    if (child.stdin) {
      child.stdin.write(prompt);
      child.stdin.end();
    }

    // stdout: stream-json を行ごとにパース
    child.stdout.on("data", (chunk: Buffer | string) => {
      stdoutBuffer += chunk.toString();
      const parts = stdoutBuffer.split("\n");
      stdoutBuffer = parts.pop() ?? "";

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          // JSON でない行はそのまま出力
          void options.onOutput?.({
            stream: "stdout",
            line: trimmed,
            at: new Date().toISOString(),
          });
          continue;
        }

        const obj = parsed as Record<string, unknown>;

        // result タイプは最終出力として保持
        if (obj.type === "result" && typeof obj.result === "string") {
          lastResultText = obj.result;
        }

        const text = extractTextFromStreamLine(parsed);
        if (text) {
          collectedTexts.push(text);
          void options.onOutput?.({
            stream: "stdout",
            line: text,
            at: new Date().toISOString(),
          });
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderrBuffer += chunk.toString();
      const parts = stderrBuffer.split("\n");
      stderrBuffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line) continue;
        stderrLines.push(line);
        void options.onOutput?.({
          stream: "stderr",
          line,
          at: new Date().toISOString(),
        });
      }
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

      // 残りバッファを処理
      if (stdoutBuffer.trim()) {
        try {
          const parsed = JSON.parse(stdoutBuffer.trim());
          const obj = parsed as Record<string, unknown>;
          if (obj.type === "result" && typeof obj.result === "string") {
            lastResultText = obj.result;
          }
          const text = extractTextFromStreamLine(parsed);
          if (text) collectedTexts.push(text);
        } catch {
          // ignore
        }
      }

      void complete({
        status: timedOut || code !== 0 ? "failed" : "completed",
        exitCode: code,
        signal,
        startedAt,
        finishedAt: new Date().toISOString(),
        model,
        cwd,
        timedOut,
        errorMessage: timedOut
          ? `タイムアウトしました（${timeoutSec}秒）`
          : code === 0
            ? null
            : "Claude Code の実行に失敗しました。",
      });
    });
  });
}
