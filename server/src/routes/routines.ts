import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function routineRoutes(context: AppContext) {
  const router = Router();

  router.get("/routines", (_req, res) => {
    res.json({ routines: store.listRoutines(context.db) });
  });

  router.post("/routines", (req, res) => {
    const routine = store.saveRoutine(context.db, req.body);
    const activity = store.addActivity(context.db, {
      kind: "routine",
      title: `${routine?.name ?? "ルーティン"} を追加`,
      description: "定期実行設定を保存しました。",
      entityType: "routine",
      entityId: routine?.id,
    });
    context.sse.broadcast({ type: "routine", payload: routine });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.status(201).json(routine);
  });

  router.put("/routines/:routineId", (req, res) => {
    const routine = store.saveRoutine(context.db, { ...req.body, id: req.params.routineId });
    const activity = store.addActivity(context.db, {
      kind: "routine",
      title: `${routine?.name ?? "ルーティン"} を更新`,
      description: "スケジュールとトリガー設定を更新しました。",
      entityType: "routine",
      entityId: routine?.id,
    });
    context.sse.broadcast({ type: "routine", payload: routine });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.json(routine);
  });

  router.post("/routines/:routineId/trigger", (req, res) => {
    const routine = store.triggerRoutine(context.db, req.params.routineId, "手動");
    if (!routine) {
      res.status(404).json({ message: "ルーティンが見つかりません。" });
      return;
    }
    const activity = store.addActivity(context.db, {
      kind: "routine",
      title: `${routine.name} を手動実行`,
      description: `${routine.lastStatus} としてログを記録しました。`,
      entityType: "routine",
      entityId: routine.id,
    });
    context.sse.broadcast({ type: "routine", payload: routine });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.json(routine);
  });

  router.delete("/routines/:routineId", (req, res) => {
    store.deleteRoutine(context.db, req.params.routineId);
    const activity = store.addActivity(context.db, {
      kind: "routine",
      title: "ルーティンを削除",
      description: "関連する実行履歴も削除しました。",
      entityType: "routine",
      entityId: req.params.routineId,
    });
    context.sse.broadcast({ type: "routine-deleted", payload: { id: req.params.routineId } });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.status(204).send();
  });

  return router;
}

