import type Database from "better-sqlite3";
import { store } from "../db/store.js";
import type { RoutineRecord } from "../types.js";
import type { SseService } from "./sse.js";

export class RoutineScheduler {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: Database.Database,
    private readonly sse: SseService,
    private readonly intervalMs: number,
  ) {}

  start() {
    this.stop();
    this.timer = setInterval(() => {
      const now = Date.now();
      const dueRoutines = store
        .listRoutines(this.db)
        .filter((routine: RoutineRecord) => routine.isEnabled && routine.nextRunAt && new Date(routine.nextRunAt).getTime() <= now);

      dueRoutines.forEach((routine: RoutineRecord) => {
        const result = store.triggerRoutine(this.db, routine.id, "スケジュール");
        if (!result) return;
        const activity = store.addActivity(this.db, {
          kind: "routine",
          title: `${result.name} をスケジュール実行`,
          description: `${result.lastStatus === "成功" ? "正常終了" : "失敗"}として記録しました。`,
          entityType: "routine",
          entityId: result.id,
        });
        this.sse.broadcast({ type: "routine", payload: result });
        this.sse.broadcast({ type: "activity", payload: activity });
      });
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
