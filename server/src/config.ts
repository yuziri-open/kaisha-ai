import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "..");

export const config = {
  port: Number(process.env.PORT ?? 3200),
  host: process.env.HOST ?? "0.0.0.0",
  databasePath: process.env.KAISHA_AI_DB_PATH ?? path.resolve(serverRoot, "data/kaisha-ai.sqlite"),
  heartbeatIntervalMs: Number(process.env.KAISHA_AI_HEARTBEAT_INTERVAL_MS ?? 15000),
  routinePollIntervalMs: Number(process.env.KAISHA_AI_ROUTINE_INTERVAL_MS ?? 30000),
  uiDistPath: path.resolve(serverRoot, "../../ui/dist"),
};
