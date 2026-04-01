import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import type { AppContext } from "../types.js";

const UPLOAD_DIR = path.join(import.meta.dirname, "../../data/uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

export function uploadRoutes(_context: AppContext) {
  const router = Router();

  router.post("/upload", upload.single("file"), (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "ファイルが必要です。" });
      return;
    }
    res.json({
      id: path.parse(file.filename).name,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
    });
  });

  return router;
}

export { UPLOAD_DIR };
