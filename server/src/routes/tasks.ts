import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function taskRoutes(context: AppContext) {
  const router = Router();

  router.get("/tasks", (_req, res) => {
    res.json({ tasks: store.listTasks(context.db) });
  });

  router.get("/tasks/:taskId", (req, res) => {
    const task = store.getTask(context.db, req.params.taskId);
    if (!task) {
      res.status(404).json({ message: "タスクが見つかりません。" });
      return;
    }
    res.json(task);
  });

  router.post("/tasks", (req, res) => {
    const task = store.saveTask(context.db, req.body);
    const activity = store.addActivity(context.db, {
      kind: "task",
      title: `${task?.title ?? "タスク"} を追加`,
      description: `${task?.status ?? "バックログ"} に配置しました。`,
      entityType: "task",
      entityId: task?.id,
    });
    context.sse.broadcast({ type: "task", payload: task });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.status(201).json(task);
  });

  router.put("/tasks/:taskId", (req, res) => {
    const task = store.saveTask(context.db, { ...req.body, id: req.params.taskId });
    const activity = store.addActivity(context.db, {
      kind: "task",
      title: `${task?.title ?? "タスク"} を更新`,
      description: `現在のステータスは ${task?.status ?? "未設定"} です。`,
      entityType: "task",
      entityId: task?.id,
    });
    context.sse.broadcast({ type: "task", payload: task });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.json(task);
  });

  router.delete("/tasks/:taskId", (req, res) => {
    store.deleteTask(context.db, req.params.taskId);
    const activity = store.addActivity(context.db, {
      kind: "task",
      title: "タスクを削除",
      description: "関連コメントと作業ログも削除しました。",
      entityType: "task",
      entityId: req.params.taskId,
    });
    context.sse.broadcast({ type: "task-deleted", payload: { id: req.params.taskId } });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.status(204).send();
  });

  return router;
}

