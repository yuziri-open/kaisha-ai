import { Bot } from "lucide-react";
import type { Agent, LiveAgent } from "@/lib/types";

interface Props {
  agent: Agent;
  live?: LiveAgent;
}

function statusClass(status: string) {
  switch (status) {
    case "active":
      return "status-pill-active";
    case "idle":
      return "status-pill-idle";
    case "error":
      return "status-pill-error";
    default:
      return "status-pill-offline";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "稼働中";
    case "idle":
      return "待機中";
    case "error":
      return "エラー";
    default:
      return "オフライン";
  }
}

export function AgentCard({ agent, live }: Props) {
  const status = live?.status ?? "offline";

  return (
    <div className="glass hover-lift hover-glow relative overflow-hidden rounded-[20px] p-5">
      {/* Status indicator dot */}
      <div
        className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full"
        style={{
          background:
            status === "active"
              ? "#34C759"
              : status === "idle"
                ? "#FF9F0A"
                : status === "error"
                  ? "#FF3B30"
                  : "rgba(128,128,128,0.3)",
          boxShadow:
            status === "active"
              ? "0 0 8px rgba(52, 199, 89, 0.5)"
              : status === "error"
                ? "0 0 8px rgba(255, 59, 48, 0.4)"
                : "none",
        }}
      />

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[rgba(0,122,255,0.15)] to-[rgba(175,82,222,0.1)] text-[#007AFF]">
          <Bot size={20} strokeWidth={1.6} />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-[14px] font-semibold text-foreground">{agent.name}</h4>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{agent.role}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className={`status-pill ${statusClass(status)}`}>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background:
                status === "active" ? "#34C759" : status === "idle" ? "#FF9F0A" : status === "error" ? "#FF3B30" : "#999",
            }}
          />
          {statusLabel(status)}
        </span>
        {live?.currentTask && (
          <p className="max-w-[120px] truncate text-[11px] text-muted-foreground">{live.currentTask}</p>
        )}
      </div>
    </div>
  );
}
