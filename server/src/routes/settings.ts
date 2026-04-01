import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function settingsRoutes(context: AppContext) {
  const router = Router();

  router.get("/settings", (_req, res) => {
    res.json(store.getSettings(context.db));
  });

  router.put("/settings", (req, res) => {
    const settings = store.saveSettings(context.db, req.body);
    const activity = store.addActivity(context.db, {
      kind: "settings",
      title: "設定を更新",
      description: "インスタンス設定と会社設定を保存しました。",
      entityType: "settings",
      entityId: "global",
    });
    context.sse.broadcast({ type: "settings", payload: settings });
    context.sse.broadcast({ type: "activity", payload: activity });
    res.json(settings);
  });

  return router;
}

