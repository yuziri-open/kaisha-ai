import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { AppContext } from "../types.js";

export function filesystemRoutes(_context: AppContext) {
  const router = Router();

  router.get("/filesystem/drives", (_req, res) => {
    try {
      const raw = execSync("wmic logicaldisk get name", { encoding: "utf8" });
      const drives = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => /^[A-Z]:$/.test(l));
      res.json({ drives: drives.length ? drives : ["C:"] });
    } catch {
      res.json({ drives: ["C:"] });
    }
  });

  router.get("/filesystem/browse", (req, res) => {
    const dirPath = (req.query.path as string) || "C:\\";
    try {
      const stat = fs.statSync(dirPath);
      if (!stat.isDirectory()) {
        res.status(400).json({ error: "ディレクトリではありません。" });
        return;
      }
      const entries = fs.readdirSync(dirPath, { withFileTypes: true }).map((entry) => {
        let size = 0;
        try {
          if (entry.isFile()) size = fs.statSync(path.join(dirPath, entry.name)).size;
        } catch {}
        return {
          name: entry.name,
          type: entry.isDirectory() ? "directory" as const : "file" as const,
          size,
        };
      });
      // Sort: directories first
      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      res.json({
        path: dirPath,
        parent: path.dirname(dirPath),
        entries,
      });
    } catch (err) {
      res.status(400).json({ error: `ディレクトリを開けません: ${(err as Error).message}` });
    }
  });

  return router;
}
