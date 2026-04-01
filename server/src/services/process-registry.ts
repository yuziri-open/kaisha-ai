import type { ChildProcess } from "node:child_process";

/** Tracks running child processes by runId so they can be cancelled. */
const registry = new Map<string, ChildProcess>();

export function registerProcess(runId: string, child: ChildProcess) {
  registry.set(runId, child);
  child.once("close", () => registry.delete(runId));
  child.once("error", () => registry.delete(runId));
}

export function cancelProcess(runId: string): boolean {
  const child = registry.get(runId);
  if (!child) return false;
  child.kill();
  registry.delete(runId);
  return true;
}

export function isRunning(runId: string): boolean {
  return registry.has(runId);
}
