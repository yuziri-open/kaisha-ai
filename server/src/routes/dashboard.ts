import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function dashboardRoutes(context: AppContext) {
  const router = Router();

  router.get("/dashboard", (_req, res) => {
    res.json(store.listDashboard(context.db));
  });

  router.get("/activity", (_req, res) => {
    res.json(store.listActivities(context.db));
  });

  return router;
}

