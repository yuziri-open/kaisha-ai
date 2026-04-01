import { Router } from "express";
import { store } from "../db/store.js";
import { WorkflowEngine } from "../services/workflow-engine.js";
import type { AppContext } from "../types.js";

export function workflowRoutes(context: AppContext) {
  const router = Router();

  router.get("/workflows", (_req, res) => {
    res.json({ workflows: store.listWorkflows(context.db) });
  });

  router.get("/workflows/:id", (req, res) => {
    const workflow = store.getWorkflow(context.db, req.params.id);
    if (!workflow) { res.status(404).json({ message: "ワークフローが見つかりません。" }); return; }
    const runs = store.listWorkflowRuns(context.db, req.params.id);
    res.json({ ...workflow, runs });
  });

  router.post("/workflows", (req, res) => {
    const { name, description, steps } = req.body ?? {};
    if (!name) { res.status(400).json({ message: "名前は必須です。" }); return; }
    const workflow = store.saveWorkflow(context.db, { name, description: description ?? "", steps: steps ?? [] });
    res.status(201).json(workflow);
  });

  router.put("/workflows/:id", (req, res) => {
    const existing = store.getWorkflow(context.db, req.params.id);
    if (!existing) { res.status(404).json({ message: "ワークフローが見つかりません。" }); return; }
    const workflow = store.saveWorkflow(context.db, { id: req.params.id, ...req.body });
    res.json(workflow);
  });

  router.delete("/workflows/:id", (req, res) => {
    store.deleteWorkflow(context.db, req.params.id);
    res.status(204).end();
  });

  router.post("/workflows/:id/run", (req, res) => {
    const workflow = store.getWorkflow(context.db, req.params.id);
    if (!workflow) { res.status(404).json({ message: "ワークフローが見つかりません。" }); return; }
    const input = typeof req.body?.input === "string" ? req.body.input : "";
    const run = store.createWorkflowRun(context.db, req.params.id, input);
    if (!run) { res.status(500).json({ message: "実行の作成に失敗しました。" }); return; }
    res.status(202).json(run);
    const engine = new WorkflowEngine(context);
    void engine.execute(workflow, run.id, input);
  });

  router.get("/workflows/:id/runs", (req, res) => {
    res.json({ runs: store.listWorkflowRuns(context.db, req.params.id) });
  });

  router.get("/workflow-runs/:runId", (req, res) => {
    const run = store.getWorkflowRun(context.db, req.params.runId);
    if (!run) { res.status(404).json({ message: "実行が見つかりません。" }); return; }
    res.json(run);
  });

  return router;
}
