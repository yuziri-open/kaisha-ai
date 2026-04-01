import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function goalRoutes(context: AppContext) {
  const router = Router();

  router.get("/goals", (_req, res) => {
    res.json({ goals: store.listGoals(context.db) });
  });

  return router;
}

