import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function dashboardRoutes(context: AppContext) {
  const router = Router();

  router.get("/dashboard", (_req, res) => {
    res.json(store.listDashboard(context.db));
  });

  router.get("/activity", (req, res) => {
    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const limit = typeof req.query.limit === "string" ? Math.min(200, Math.max(1, Number(req.query.limit) || 100)) : 100;
    const offset = typeof req.query.offset === "string" ? Math.max(0, Number(req.query.offset) || 0) : 0;
    res.json(store.listActivitiesFiltered(context.db, { kind, limit, offset }));
  });

  return router;
}

