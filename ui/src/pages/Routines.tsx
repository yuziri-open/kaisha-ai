import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Routine } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const emptyRoutine: Partial<Routine> = {
  name: "",
  description: "",
  agentId: null,
  scheduleType: "interval",
  cronExpression: "0 9 * * *",
  intervalMinutes: 30,
  isEnabled: true,
};

export function RoutinesPage() {
  const queryClient = useQueryClient();
  const routinesQuery = useQuery({ queryKey: ["routines"], queryFn: api.routines });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: api.agents });
  const [editing, setEditing] = useState<Partial<Routine> | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Routine>) => (payload.id ? api.updateRoutine(payload.id, payload) : api.createRoutine(payload)),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => api.triggerRoutine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRoutine(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["routines"] }),
  });

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">ルーティン / Heartbeat</h2>
            <p className="mt-2 text-sm text-muted-foreground">cron 式とインターバルで定期実行を管理し、手動トリガーも可能です。</p>
          </div>
          <Button onClick={() => setEditing(emptyRoutine)}>
            <Plus size={16} />
            ルーティン追加
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {routinesQuery.data?.routines.map((routine) => (
          <Card key={routine.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{routine.name}</h3>
                  <Badge>{routine.lastStatus}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{routine.description}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => triggerMutation.mutate(routine.id)}>
                  <Play size={14} />
                  実行
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(routine)}>
                  編集
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(routine.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <div>
                <p>方式</p>
                <p className="mt-1 text-foreground">{routine.scheduleType === "cron" ? `cron: ${routine.cronExpression}` : `${routine.intervalMinutes} 分ごと`}</p>
              </div>
              <div>
                <p>次回実行</p>
                <p className="mt-1 text-foreground">{formatDate(routine.nextRunAt)}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {routine.runs.map((run) => (
                <div key={run.id} className="rounded-[16px] border border-white/12 bg-white/8 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-foreground">{run.triggerType}</span>
                    <span className="text-muted-foreground">{formatDate(run.startedAt)}</span>
                  </div>
                  <p className="mt-2 text-muted-foreground">{run.log}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "ルーティン編集" : "ルーティン追加"}
        description="cron 式またはインターバルで Heartbeat ルールを構成します。"
      >
        {editing ? (
          <RoutineEditor
            editing={editing}
            onSubmit={(payload) => saveMutation.mutate(payload)}
            agents={agentsQuery.data?.agents ?? []}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function RoutineEditor({
  editing,
  onSubmit,
  agents,
}: {
  editing: Partial<Routine>;
  onSubmit: (payload: Partial<Routine>) => void;
  agents: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<Partial<Routine>>(editing);
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-muted-foreground">
          ルーティン名
          <Input value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          実行エージェント
          <Input
            list="routine-agents"
            value={form.agentId ?? ""}
            onChange={(event) => setForm({ ...form, agentId: event.target.value || null })}
          />
          <datalist id="routine-agents">
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </datalist>
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          スケジュール方式
          <Input
            value={form.scheduleType ?? "interval"}
            onChange={(event) => setForm({ ...form, scheduleType: event.target.value as Routine["scheduleType"] })}
          />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          cron 式
          <Input
            value={form.cronExpression ?? ""}
            onChange={(event) => setForm({ ...form, cronExpression: event.target.value })}
            placeholder="0 9 * * *"
          />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          インターバル（分）
          <Input
            type="number"
            value={form.intervalMinutes ?? 30}
            onChange={(event) => setForm({ ...form, intervalMinutes: Number(event.target.value) })}
          />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          有効化
          <Input
            value={form.isEnabled ? "true" : "false"}
            onChange={(event) => setForm({ ...form, isEnabled: event.target.value === "true" })}
          />
        </label>
      </div>
      <label className="space-y-2 text-sm text-muted-foreground">
        説明
        <Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>
      <div className="flex justify-end">
        <Button onClick={() => onSubmit(form)}>保存する</Button>
      </div>
    </div>
  );
}

