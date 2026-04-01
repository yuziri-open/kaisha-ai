import { Router } from "express";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function costRoutes(context: AppContext) {
  const router = Router();

  router.get("/costs", (_req, res) => {
    res.json(store.getCosts(context.db));
  });

  return router;
}

