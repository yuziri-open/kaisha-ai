import { executeCodex } from "../adapters/codex.js";
import { executeClaude } from "../adapters/claude.js";
import { store } from "../db/store.js";
import type { AppContext, WorkflowRecord, WorkflowStepResult, CodexAdapterConfig, ClaudeAdapterConfig } from "../types.js";

export class WorkflowEngine {
  constructor(private context: AppContext) {}

  async execute(workflow: WorkflowRecord, runId: string, input: string) {
    const results: WorkflowStepResult[] = [];

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const agent = store.getAgent(this.context.db, step.agentId);
      if (!agent) {
        results.push({
          stepIndex: i,
          agentId: step.agentId,
          status: "failed",
          output: `エージェント ${step.agentId} が見つかりません。`,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        });
        store.updateWorkflowRun(this.context.db, runId, {
          status: "failed",
          currentStep: i,
          results,
          finishedAt: new Date().toISOString(),
        });
        this.context.sse.broadcast({ type: "workflow:step", payload: { runId, step: i, status: "failed" } });
        return;
      }

      // Expand template variables
      let prompt = step.prompt;
      prompt = prompt.replace(/\{\{input\}\}/g, input);
      if (i > 0) {
        prompt = prompt.replace(/\{\{prev\.output\}\}/g, results[i - 1]?.output ?? "");
      }
      prompt = prompt.replace(/\{\{step\[(\d+)\]\.output\}\}/g, (_match, idx) => {
        const stepIdx = Number(idx);
        return results[stepIdx]?.output ?? "";
      });

      store.updateWorkflowRun(this.context.db, runId, { currentStep: i, results });
      this.context.sse.broadcast({ type: "workflow:step", payload: { runId, step: i, status: "running" } });

      const startedAt = new Date().toISOString();
      const isClaudeAdapter = agent.adapterType === "Claude Code";
      const stepConfig = step.config ?? {};
      const agentConfig = agent.adapterConfig as CodexAdapterConfig & ClaudeAdapterConfig;

      try {
        const onOutput = async () => {};

        const result = isClaudeAdapter
          ? await executeClaude({
              prompt,
              runId: `wf-${runId}-${i}`,
              config: {
                model: (stepConfig.model as string) ?? agentConfig.model ?? "claude-sonnet-4-20250514",
                cwd: (stepConfig.cwd as string) ?? agentConfig.cwd,
                maxTurns: (stepConfig.maxTurns as number) ?? agentConfig.maxTurns ?? 10,
                timeoutSec: (stepConfig.timeoutSec as number) ?? agentConfig.timeoutSec ?? 600,
                env: agentConfig.env,
              },
              onOutput,
            })
          : await executeCodex({
              prompt,
              runId: `wf-${runId}-${i}`,
              config: {
                model: (stepConfig.model as string) ?? agentConfig.model ?? "gpt-5.4",
                cwd: (stepConfig.cwd as string) ?? agentConfig.cwd,
                fullAuto: (stepConfig.fullAuto as boolean) ?? agentConfig.fullAuto ?? true,
                timeoutSec: (stepConfig.timeoutSec as number) ?? agentConfig.timeoutSec ?? 300,
                env: agentConfig.env,
              },
              onOutput,
            });

        const finishedAt = new Date().toISOString();
        results.push({
          stepIndex: i,
          agentId: step.agentId,
          status: result.status === "completed" ? "completed" : "failed",
          output: result.output.trim() || result.errorMessage || "",
          startedAt,
          finishedAt,
        });

        if (result.status !== "completed") {
          store.updateWorkflowRun(this.context.db, runId, {
            status: "failed",
            currentStep: i,
            results,
            finishedAt,
          });
          this.context.sse.broadcast({ type: "workflow:step", payload: { runId, step: i, status: "failed" } });
          return;
        }
      } catch (error) {
        const finishedAt = new Date().toISOString();
        results.push({
          stepIndex: i,
          agentId: step.agentId,
          status: "failed",
          output: error instanceof Error ? error.message : "不明なエラー",
          startedAt,
          finishedAt,
        });
        store.updateWorkflowRun(this.context.db, runId, {
          status: "failed",
          currentStep: i,
          results,
          finishedAt,
        });
        this.context.sse.broadcast({ type: "workflow:step", payload: { runId, step: i, status: "failed" } });
        return;
      }

      this.context.sse.broadcast({ type: "workflow:step", payload: { runId, step: i, status: "completed" } });
    }

    store.updateWorkflowRun(this.context.db, runId, {
      status: "completed",
      currentStep: workflow.steps.length,
      results,
      finishedAt: new Date().toISOString(),
    });
    this.context.sse.broadcast({ type: "workflow:complete", payload: { runId, status: "completed" } });
  }
}
