import cors from "cors";
import express from "express";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { createDatabase } from "./db/schema.js";
import { approvalRoutes } from "./routes/approvals.js";
import { agentRoutes } from "./routes/agents.js";
import { costRoutes } from "./routes/costs.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { goalRoutes } from "./routes/goals.js";
import { routineRoutes } from "./routes/routines.js";
import { settingsRoutes } from "./routes/settings.js";
import { taskRoutes } from "./routes/tasks.js";
import { RoutineScheduler } from "./services/cron.js";
import { HeartbeatService } from "./services/heartbeat.js";
import { SseService } from "./services/sse.js";
import type { AppContext } from "./types.js";

const db = createDatabase();
const sse = new SseService();
const context: AppContext = { db, sse };
const heartbeat = new HeartbeatService(db, sse, config.heartbeatIntervalMs);
const scheduler = new RoutineScheduler(db, sse, config.routinePollIntervalMs);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    name: "KAISHA AI オーケストレーター",
    status: "ok",
    port: config.port,
    databasePath: config.databasePath,
    serverTime: new Date().toISOString(),
  });
});

app.get("/api/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const clientId = randomUUID();
  const close = () => {};
  sse.addClient({
    id: clientId,
    write: (chunk) => res.write(chunk),
    close,
  });

  res.write(`event: ready\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);
  const keepAlive = setInterval(() => sse.ping(), 20000);
  req.on("close", () => {
    clearInterval(keepAlive);
    sse.removeClient(clientId);
    res.end();
  });
});

app.use("/api", dashboardRoutes(context));
app.use("/api", agentRoutes(context));
app.use("/api", taskRoutes(context));
app.use("/api", goalRoutes(context));
app.use("/api", routineRoutes(context));
app.use("/api", costRoutes(context));
app.use("/api", approvalRoutes(context));
app.use("/api", settingsRoutes(context));

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API が見つかりません。" });
});

if (existsSync(path.join(config.uiDistPath, "index.html"))) {
  app.use(express.static(config.uiDistPath));
  app.get("*", (_req, res) => {
    res.type("html").send(readFileSync(path.join(config.uiDistPath, "index.html"), "utf8"));
  });
}

const server = app.listen(config.port, config.host, () => {
  heartbeat.start();
  scheduler.start();
  console.log(`[kaisha-ai] server listening on http://${config.host}:${config.port}`);
});

process.on("SIGINT", () => {
  heartbeat.stop();
  scheduler.stop();
  server.close(() => process.exit(0));
});

