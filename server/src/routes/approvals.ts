import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function approvalRoutes(context: AppContext) {
  const router = Router();

  router.get("/approvals", (_req, res) => {
    res.json({ approvals: store.listApprovals(context.db) });
  });

  router.post("/approvals/:approvalId/decision", (req, res) => {
    const decision = req.body?.decision === "却下" ? "却下" : "承認";
    const comment = typeof req.body?.comment === "string" ? req.body.comment : "";
    const approval = store.decideApproval(context.db, req.params.approvalId, decision, comment);
    if (!approval) {
      res.status(404).json({ message: "承認対象が見つかりません。" });
      return;
    }
    const activity = store.addActivity(context.db, {
      kind: "approval",
      title: `${approval.title} を${decision}`,
      description: comment || "コメントなしで処理しました。",
      entityType: "approval",
      entityId: approval.id,
    });
    context.sse.broadcast({ type: "approval", payload: approval });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.json(approval);
  });

  return router;
}

