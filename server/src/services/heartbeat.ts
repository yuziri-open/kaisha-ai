import type Database from "better-sqlite3";
import { store } from "../db/store.js";
import type { SseService } from "./sse.js";

const MESSAGES = [
  "承認待ちを再確認しています",
  "最新ログを吸い上げました",
  "ダッシュボード用メトリクスを更新しました",
  "ルーティン実行状態は安定しています",
  "引き継ぎメモを整形しました",
];

export class HeartbeatService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: Database.Database,
    private readonly sse: SseService,
    private readonly intervalMs: number,
  ) {}

  start() {
    this.stop();
    this.timer = setInterval(() => {
      const agents = store.listAgents(this.db).filter((agent) => agent.status !== "停止");
      if (agents.length === 0) return;
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      const status = agent.status === "注意" && Math.random() > 0.5 ? "稼働中" : agent.status;
      const cpuUsage = Math.min(95, Math.max(12, Math.round((Math.random() * 40 + 28) * 10) / 10));
      const memoryUsage = Math.min(98, Math.max(20, Math.round((Math.random() * 35 + 40) * 10) / 10));

      store.recordHeartbeat(this.db, {
        agentId: agent.id,
        status,
        message,
        cpuUsage,
        memoryUsage,
      });

      const activity = store.addActivity(this.db, {
        kind: "heartbeat",
        title: `${agent.name} が Heartbeat を送信`,
        description: message,
        entityType: "agent",
        entityId: agent.id,
      });

      this.sse.broadcast({ type: "heartbeat", payload: { agentId: agent.id } });
      this.sse.broadcast({ type: "activity", payload: activity });
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

