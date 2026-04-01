import type { ReactNode } from "react";
import { Bot } from "lucide-react";
import type { Agent, AgentLiveCard } from "@/lib/types";

interface Props {
  agent: Agent;
  live?: AgentLiveCard;
  actions?: ReactNode;
}

function statusClass(status: string) {
  switch (status) {
    case "稼働中": return "status-pill-active";
    case "待機": return "status-pill-idle";
    case "注意": return "status-pill-error";
    default: return "status-pill-offline";
  }
}

export function AgentCard({ agent, live, actions }: Props) {
  const status = live?.status ?? agent.status ?? "停止";

  return (
    <div className="glass hover-lift hover-glow relative overflow-hidden rounded-[20px] p-5">
      {/* Status dot */}
      <div
        className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full"
        style={{
          background: status === "稼働中" ? "#34C759" : status === "待機" ? "#FF9F0A" : status === "注意" ? "#FF3B30" : "rgba(128,128,128,0.3)",
          boxShadow: status === "稼働中" ? "0 0 8px rgba(52, 199, 89, 0.5)" : "none",
        }}
      />

      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
          style={{ background: `${agent.color ?? "#007AFF"}22` }}
        >
          <Bot size={20} style={{ color: agent.color ?? "#007AFF" }} strokeWidth={1.6} />
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
            style={{ background: status === "稼働中" ? "#34C759" : status === "待機" ? "#FF9F0A" : status === "注意" ? "#FF3B30" : "#999" }}
          />
          {status}
        </span>
        {actions && <div className="flex gap-1">{actions}</div>}
      </div>

      {live?.message && (
        <p className="mt-3 truncate text-[11px] text-muted-foreground">{live.message}</p>
      )}
    </div>
  );
}
