import { Bot, CheckCircle2, Clock, Coins } from "lucide-react";

interface SummaryData {
  activeAgents: number;
  inProgressTasks: number;
  pendingApprovals: number;
  monthlyCost: number;
}

const metrics = [
  {
    key: "activeAgents" as const,
    label: "稼働エージェント",
    icon: Bot,
    color: "#007AFF",
    bgFrom: "rgba(0, 122, 255, 0.12)",
  },
  {
    key: "inProgressTasks" as const,
    label: "進行中タスク",
    icon: Clock,
    color: "#FF9F0A",
    bgFrom: "rgba(255, 159, 10, 0.12)",
  },
  {
    key: "pendingApprovals" as const,
    label: "承認待ち",
    icon: CheckCircle2,
    color: "#AF52DE",
    bgFrom: "rgba(175, 82, 222, 0.12)",
  },
  {
    key: "monthlyCost" as const,
    label: "今月のコスト",
    icon: Coins,
    color: "#34C759",
    bgFrom: "rgba(52, 199, 89, 0.12)",
  },
];

export function DashboardCards({ summary }: { summary: SummaryData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        const value = m.key === "monthlyCost"
          ? `¥${summary[m.key].toLocaleString()}`
          : summary[m.key];
        return (
          <div
            key={m.key}
            className="glass hover-lift hover-glow relative overflow-hidden rounded-[20px] p-5"
          >
            <div
              className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-60 blur-2xl"
              style={{ background: m.bgFrom }}
            />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {m.label}
                </p>
                <p className="metric-number mt-2 text-3xl font-semibold text-foreground">
                  {value}
                </p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                style={{ background: m.bgFrom }}
              >
                <Icon size={20} style={{ color: m.color }} strokeWidth={1.8} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
