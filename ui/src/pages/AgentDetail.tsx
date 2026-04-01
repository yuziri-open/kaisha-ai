import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export function AgentDetailPage() {
  const params = useParams<{ agentId: string }>();
  const query = useQuery({
    queryKey: ["agent", params.agentId],
    queryFn: () => api.agent(params.agentId ?? ""),
    enabled: Boolean(params.agentId),
  });

  if (!query.data) {
    return <div className="glass-panel rounded-[28px] p-8 text-sm text-muted-foreground">エージェント詳細を読み込み中です...</div>;
  }

  const { agent, taskHistory, heartbeats } = query.data;

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-18 w-18 rounded-[22px] border border-white/25" style={{ background: `${agent.color}66` }} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-semibold text-foreground">{agent.name}</h2>
                <Badge>{agent.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {agent.role} / {agent.team}
              </p>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <div>
              <p>アダプター</p>
              <p className="mt-1 text-foreground">{agent.adapterType}</p>
            </div>
            <div>
              <p>今月コスト</p>
              <p className="mt-1 text-foreground">{formatCurrency(agent.monthlyCost)}</p>
            </div>
            <div>
              <p>最終稼働</p>
              <p className="mt-1 text-foreground">{formatDate(agent.lastHeartbeatAt)}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-surface rounded-[22px] p-4">
            <p className="text-sm text-muted-foreground">設定メモ</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">{agent.prompt}</p>
          </div>
          <div className="glass-surface rounded-[22px] p-4">
            <p className="text-sm text-muted-foreground">スキル</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h3 className="text-xl font-semibold text-foreground">担当タスク履歴</h3>
          <div className="mt-4 space-y-3">
            {taskHistory.map((task) => (
              <div key={task.id} className="rounded-[18px] border border-white/12 bg-white/8 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{task.title}</p>
                  <Badge>{task.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-xl font-semibold text-foreground">Heartbeat ログ</h3>
          <div className="mt-4 space-y-3">
            {heartbeats.map((heartbeat) => (
              <div key={heartbeat.id} className="rounded-[18px] border border-white/12 bg-white/8 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{heartbeat.message}</p>
                  <span className="text-xs text-muted-foreground">{formatDate(heartbeat.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  CPU {heartbeat.cpuUsage}% / MEM {heartbeat.memoryUsage}% / ステータス {heartbeat.status}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

