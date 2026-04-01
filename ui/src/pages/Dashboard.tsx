import { useQuery } from "@tanstack/react-query";
import { Card, CardSubtle, CardAccent } from "@/components/ui/card";
import { DashboardCards } from "@/components/DashboardCards";
import { AgentCard } from "@/components/AgentCard";
import { api } from "@/api/client";
import { formatDate } from "@/lib/utils";
import { Activity, Sparkles, Zap } from "lucide-react";

export function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });

  if (!query.data) {
    return (
      <div className="glass rounded-[28px] p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(0,122,255,0.1)]">
          <Sparkles size={22} className="text-[#007AFF]" />
        </div>
        <p className="text-sm text-muted-foreground">ダッシュボードを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <Card className="overflow-hidden rounded-[28px] p-0">
        <div className="relative p-8">
          {/* Decorative gradient */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-[rgba(0,122,255,0.15)] to-[rgba(175,82,222,0.1)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-gradient-to-br from-[rgba(52,199,89,0.1)] to-[rgba(90,200,250,0.08)] blur-3xl" />

          <div className="relative grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-1">
                <Zap size={12} className="text-[#007AFF]" />
                <span className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground">KAISHA AI</span>
              </div>
              <h2 className="max-w-xl text-3xl font-semibold leading-snug tracking-tight text-foreground">
                エージェントの稼働状況を<br />
                ひとつの管制室で。
              </h2>
              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-muted-foreground">
                タスク進行、承認フロー、コスト推移をリアルタイムで可視化。
                チームのAIエージェントを一元管理します。
              </p>
            </div>

            {/* Recent activity mini-card */}
            <div className="glass-subtle rounded-[20px] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Activity size={14} className="text-[#007AFF]" />
                <p className="text-[12px] font-medium text-foreground">直近の動き</p>
              </div>
              <div className="space-y-2">
                {query.data.activities.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-[12px] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 backdrop-blur-sm transition-colors hover:bg-[var(--glass-bg-strong)]"
                  >
                    <p className="text-[13px] font-medium text-foreground">{activity.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(activity.occurredAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Metric cards */}
      <DashboardCards summary={query.data.summary} />

      {/* Main content grid */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {/* Activity feed */}
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-2">
            <Activity size={16} className="text-[#007AFF]" />
            <h3 className="text-lg font-semibold text-foreground">アクティビティ</h3>
          </div>
          <div className="space-y-2">
            {query.data.activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between gap-3 rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4 transition-colors hover:bg-[var(--glass-bg)]"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{activity.title}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{activity.description}</p>
                </div>
                <span className="flex-shrink-0 text-[11px] text-muted-foreground">{formatDate(activity.occurredAt)}</span>
              </div>
            ))}
            {query.data.activities.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">まだアクティビティがありません</p>
            )}
          </div>
        </Card>

        {/* Live agents */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#34C759]" />
            <h3 className="text-lg font-semibold text-foreground">リアルタイム稼働</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {query.data.liveAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={{
                  ...agent,
                  team: "",
                  adapterType: "",
                  reportsToId: null,
                  costPerHour: 0,
                  monthlyCost: 0,
                  prompt: "",
                  skills: [],
                  createdAt: agent.lastHeartbeatAt ?? "",
                  updatedAt: agent.lastHeartbeatAt ?? "",
                }}
                live={agent}
              />
            ))}
            {query.data.liveAgents.length === 0 && (
              <div className="glass col-span-full rounded-[20px] p-8 text-center">
                <p className="text-sm text-muted-foreground">エージェントが登録されていません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
