import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function agentRoutes(context: AppContext) {
  const router = Router();

  router.get("/agents", (_req, res) => {
    res.json({ agents: store.listAgents(context.db), orgChart: store.listOrgChart(context.db) });
  });

  router.get("/agents/:agentId", (req, res) => {
    const detail = store.getAgentDetail(context.db, req.params.agentId);
    if (!detail) {
      res.status(404).json({ message: "エージェントが見つかりません。" });
      return;
    }
    res.json(detail);
  });

  router.post("/agents", (req, res) => {
    const detail = store.saveAgent(context.db, req.body);
    const activity = store.addActivity(context.db, {
      kind: "agent",
      title: `${detail?.agent.name ?? "エージェント"} を追加`,
      description: `${detail?.agent.role ?? "役割未設定"} として登録しました。`,
      entityType: "agent",
      entityId: detail?.agent.id,
    });
    context.sse.broadcast({ type: "agent", payload: detail?.agent ?? null });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.status(201).json(detail);
  });

  router.put("/agents/:agentId", (req, res) => {
    const detail = store.saveAgent(context.db, { ...req.body, id: req.params.agentId });
    const activity = store.addActivity(context.db, {
      kind: "agent",
      title: `${detail?.agent.name ?? "エージェント"} を更新`,
      description: "エージェント設定を保存しました。",
      entityType: "agent",
      entityId: detail?.agent.id,
    });
    context.sse.broadcast({ type: "agent", payload: detail?.agent ?? null });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.json(detail);
  });

  router.delete("/agents/:agentId", (req, res) => {
    store.deleteAgent(context.db, req.params.agentId);
    const activity = store.addActivity(context.db, {
      kind: "agent",
      title: "エージェントを削除",
      description: "関連タスクの担当は未割り当てに戻しました。",
      entityType: "agent",
      entityId: req.params.agentId,
    });
    context.sse.broadcast({ type: "agent-deleted", payload: { id: req.params.agentId } });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.status(204).send();
  });

  return router;
}

