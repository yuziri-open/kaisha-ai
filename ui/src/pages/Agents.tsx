import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { AgentCard } from "@/components/AgentCard";
import { OrgChart } from "@/components/OrgChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Agent } from "@/lib/types";

const emptyAgent: Partial<Agent> = {
  name: "",
  role: "",
  team: "",
  adapterType: "OpenClaw",
  status: "待機",
  costPerHour: 20,
  skills: [],
  prompt: "",
  color: "#007AFF",
};

export function AgentsPage() {
  const queryClient = useQueryClient();
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: api.agents });
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const [tab, setTab] = useState<"list" | "org">("list");
  const [editing, setEditing] = useState<Partial<Agent> | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: Partial<Agent>) =>
      payload.id ? api.updateAgent(payload.id, payload) : api.createAgent(payload),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (agentId: string) => api.deleteAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const liveMap = useMemo(
    () => new Map(dashboardQuery.data?.liveAgents.map((agent) => [agent.id, agent]) ?? []),
    [dashboardQuery.data?.liveAgents],
  );

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-foreground">エージェント管理</h2>
              <Badge>{agentsQuery.data?.agents.length ?? 0} 体制</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              OpenClaw / Claude Code / Codex / HTTP / Bash を横断して運用できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Tabs
              value={tab}
              onChange={setTab}
              options={[
                { value: "list", label: "一覧" },
                { value: "org", label: "組織図" },
              ]}
            />
            <Button onClick={() => setEditing(emptyAgent)}>
              <Plus size={16} />
              エージェント追加
            </Button>
          </div>
        </div>
      </Card>

      {tab === "list" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {agentsQuery.data?.agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              live={liveMap.get(agent.id)}
              actions={
                <div className="flex gap-2">
                  <Link to={`/agents/${agent.id}/chat`}>
                    <Button variant="ghost" size="sm">
                      <MessageSquare size={15} />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(agent)}>
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(agent.id)}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <OrgChart nodes={agentsQuery.data?.orgChart ?? []} />
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "エージェント編集" : "エージェント追加"}
        description="設定、役割、レポートラインを日本語で管理します。"
      >
        {editing ? <AgentEditor editing={editing} onSubmit={(payload) => mutation.mutate(payload)} agents={agentsQuery.data?.agents ?? []} /> : null}
      </Dialog>
    </div>
  );
}

function AgentEditor({
  editing,
  onSubmit,
  agents,
}: {
  editing: Partial<Agent>;
  onSubmit: (payload: Partial<Agent>) => void;
  agents: Agent[];
}) {
  const [form, setForm] = useState<Partial<Agent>>(editing);
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-muted-foreground">
          名前
          <Input value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          役割
          <Input value={form.role ?? ""} onChange={(event) => setForm({ ...form, role: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          チーム
          <Input value={form.team ?? ""} onChange={(event) => setForm({ ...form, team: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          アダプター
          <Input value={form.adapterType ?? ""} onChange={(event) => setForm({ ...form, adapterType: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          ステータス
          <Input value={form.status ?? ""} onChange={(event) => setForm({ ...form, status: event.target.value as Agent["status"] })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          時間単価
          <Input
            type="number"
            value={form.costPerHour ?? 20}
            onChange={(event) => setForm({ ...form, costPerHour: Number(event.target.value) })}
          />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          レポート先
          <Input
            list="agent-report-lines"
            value={form.reportsToId ?? ""}
            onChange={(event) => setForm({ ...form, reportsToId: event.target.value || null })}
          />
          <datalist id="agent-report-lines">
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </datalist>
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          カラー
          <Input value={form.color ?? "#007AFF"} onChange={(event) => setForm({ ...form, color: event.target.value })} />
        </label>
      </div>
      <label className="space-y-2 text-sm text-muted-foreground">
        スキル（カンマ区切り）
        <Input
          value={(form.skills ?? []).join(", ")}
          onChange={(event) => setForm({ ...form, skills: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })}
        />
      </label>
      <label className="space-y-2 text-sm text-muted-foreground">
        エージェント指示
        <Textarea value={form.prompt ?? ""} onChange={(event) => setForm({ ...form, prompt: event.target.value })} />
      </label>
      <div className="flex justify-end">
        <Button onClick={() => onSubmit(form)}>保存する</Button>
      </div>
    </div>
  );
}

