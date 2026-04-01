import { Router } from "express";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { store } from "../db/store.js";
import type { AppContext } from "../types.js";

export function skillRoutes(context: AppContext) {
  const router = Router();

  router.get("/skills", (_req, res) => {
    const skills = store.listSkills(context.db).map((s) => ({
      ...s,
      agentCount: store.getSkillAgentCount(context.db, s.id),
    }));
    res.json({ skills });
  });

  router.get("/skills/:id", (req, res) => {
    const skill = store.getSkill(context.db, req.params.id);
    if (!skill) { res.status(404).json({ message: "スキルが見つかりません。" }); return; }
    res.json(skill);
  });

  router.post("/skills", (req, res) => {
    const { name, description, content } = req.body ?? {};
    if (!name) { res.status(400).json({ message: "名前は必須です。" }); return; }
    const skill = store.saveSkill(context.db, { name, description: description ?? "", content: content ?? "" });
    res.status(201).json(skill);
  });

  router.put("/skills/:id", (req, res) => {
    const existing = store.getSkill(context.db, req.params.id);
    if (!existing) { res.status(404).json({ message: "スキルが見つかりません。" }); return; }
    const skill = store.saveSkill(context.db, { id: req.params.id, ...req.body });
    res.json(skill);
  });

  router.delete("/skills/:id", (req, res) => {
    store.deleteSkill(context.db, req.params.id);
    res.status(204).end();
  });

  router.post("/skills/import", (_req, res) => {
    const skillsDir = path.resolve(import.meta.dirname, "../../data/skills");
    let files: string[] = [];
    try { files = readdirSync(skillsDir).filter((f) => f.endsWith(".md")); } catch { /* empty */ }
    const imported: string[] = [];
    for (const file of files) {
      const content = readFileSync(path.join(skillsDir, file), "utf-8");
      const name = file.replace(/\.md$/, "");
      store.saveSkill(context.db, { name, description: `${file} からインポート`, content, filePath: file });
      imported.push(name);
    }
    res.json({ imported });
  });

  router.get("/agents/:id/skills", (req, res) => {
    const skills = store.getAgentSkills(context.db, req.params.id);
    res.json({ skills });
  });

  router.post("/agents/:id/skills", (req, res) => {
    const { skillIds } = req.body ?? {};
    if (!Array.isArray(skillIds)) { res.status(400).json({ message: "skillIds は配列で指定してください。" }); return; }
    store.setAgentSkills(context.db, req.params.id, skillIds);
    const skills = store.getAgentSkills(context.db, req.params.id);
    res.json({ skills });
  });

  return router;
}
