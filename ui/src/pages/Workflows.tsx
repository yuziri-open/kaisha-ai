import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GitBranch, Play, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardSubtle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Agent, Workflow, WorkflowStep } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const emptyWorkflow: Partial<Workflow> = { name: "", description: "", steps: [] };

export function WorkflowsPage() {
  const queryClient = useQueryClient();
  const workflowsQuery = useQuery({ queryKey: ["workflows"], queryFn: api.workflows });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: api.agents });
  const [editing, setEditing] = useState<Partial<Workflow> | null>(null);
  const [runTarget, setRunTarget] = useState<Workflow | null>(null);
  const [runInput, setRunInput] = useState("");

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Workflow>) => payload.id ? api.updateWorkflow(payload.id, payload) : api.createWorkflow(payload),
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWorkflow(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const runMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: string }) => api.runWorkflow(id, input),
    onSuccess: async (run) => {
      setRunTarget(null);
      setRunInput("");
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
      window.location.href = `/workflows/${run.workflowId}/runs/${run.id}`;
    },
  });

  const workflows = useMemo(() => workflowsQuery.data?.workflows ?? [], [workflowsQuery.data]);
  const agents = agentsQuery.data?.agents ?? [];

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch size={18} />
              <h2 className="text-2xl font-semibold text-foreground">ワークフロー</h2>
              <Badge>{workflows.length}本</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">複数エージェントを順番に実行するパイプラインを定義します。</p>
          </div>
          <Button onClick={() => setEditing(emptyWorkflow)}><Plus size={16} />ワークフロー追加</Button>
        </div>
      </Card>

      {workflows.length === 0 ? (
        <Card className="p-10">
          <div className="mx-auto max-w-xl text-center">
            <h3 className="text-xl font-semibold text-foreground">まだワークフローがありません</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">複数エージェントの順次実行が必要な処理を、ここでテンプレート化できます。</p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setEditing(emptyWorkflow)}><Plus size={16} />ワークフロー追加</Button>
            </div>
          </div>
        </Card>
      ) : (
      <div className="grid gap-4 xl:grid-cols-2">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{workflow.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{workflow.description || "説明なし"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setRunTarget(workflow)}><Play size={14} />実行</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(workflow)}>編集</Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(workflow.id)}><Trash2 size={15} /></Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {workflow.steps.map((step, index) => {
                const agent = agents.find((a) => a.id === step.agentId);
                return (
                  <CardSubtle key={`${workflow.id}-${index}`} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge>STEP {index + 1}</Badge>
                      <span className="text-xs text-muted-foreground">{agent?.name ?? step.agentId}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{step.prompt}</p>
                  </CardSubtle>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      )}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? "ワークフロー編集" : "ワークフロー追加"} description="ステップごとの担当エージェントとプロンプトを定義します。">
        {editing ? <WorkflowEditor initial={editing} agents={agents} onSubmit={(payload) => saveMutation.mutate(payload)} /> : null}
      </Dialog>

      <Dialog open={Boolean(runTarget)} onClose={() => setRunTarget(null)} title="ワークフロー実行" description="{{input}} に入る初期入力を指定します。">
        {runTarget ? (
          <div className="grid gap-4">
            <Textarea className="min-h-[180px]" value={runInput} onChange={(e) => setRunInput(e.target.value)} />
            <div className="flex justify-end">
              <Button onClick={() => runMutation.mutate({ id: runTarget.id, input: runInput })} disabled={runMutation.isPending}>
                <Play size={16} />{runMutation.isPending ? "実行中..." : "実行"}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

function WorkflowEditor({ initial, agents, onSubmit }: { initial: Partial<Workflow>; agents: Agent[]; onSubmit: (payload: Partial<Workflow>) => void }) {
  const [form, setForm] = useState<Partial<Workflow>>(initial);
  const steps = form.steps ?? [];
  const updateStep = (index: number, patch: Partial<WorkflowStep>) => {
    const next = [...steps];
    next[index] = { ...next[index], ...patch };
    setForm({ ...form, steps: next });
  };
  const move = (index: number, dir: -1 | 1) => {
    const next = [...steps];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setForm({ ...form, steps: next });
  };
  return (
    <div className="grid gap-4">
      <label className="space-y-2 text-sm text-muted-foreground">名前<Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label className="space-y-2 text-sm text-muted-foreground">説明<Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <CardSubtle key={index} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <Badge>STEP {index + 1}</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => move(index, -1)}><ArrowUp size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => move(index, 1)}><ArrowDown size={14} /></Button>
                <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, steps: steps.filter((_, i) => i !== index) })}><Trash2 size={14} /></Button>
              </div>
            </div>
            <select className="mb-3 w-full rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-foreground outline-none" value={step.agentId} onChange={(e) => updateStep(index, { agentId: e.target.value })}>
              <option value="">エージェントを選択</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
            <Textarea className="min-h-[140px]" value={step.prompt} onChange={(e) => updateStep(index, { prompt: e.target.value })} />
          </CardSubtle>
        ))}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setForm({ ...form, steps: [...steps, { agentId: "", prompt: "" }] })}><Plus size={16} />ステップ追加</Button>
        <Button onClick={() => onSubmit(form)}>保存</Button>
      </div>
    </div>
  );
}
