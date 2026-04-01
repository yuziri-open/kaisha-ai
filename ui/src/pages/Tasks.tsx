import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Task, TaskStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const emptyTask: Partial<Task> = {
  title: "",
  description: "",
  status: "バックログ",
  priority: "中",
  assigneeId: null,
  attachments: [],
};

export function TasksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: api.tasks });
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: api.agents });
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [editing, setEditing] = useState<Partial<Task> | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Task>) => (payload.id ? api.updateTask(payload.id, payload) : api.createTask(payload)),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const changeStatus = (task: Task, status: TaskStatus) => {
    saveMutation.mutate({ ...task, status });
  };

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">タスク管理</h2>
            <p className="mt-2 text-sm text-muted-foreground">Issues 相当のタスクをカンバンとリストで切り替えられます。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Tabs
              value={view}
              onChange={setView}
              options={[
                { value: "kanban", label: "カンバン" },
                { value: "list", label: "リスト" },
              ]}
            />
            <Button onClick={() => setEditing(emptyTask)}>
              <Plus size={16} />
              タスク追加
            </Button>
          </div>
        </div>
      </Card>

      {view === "kanban" ? (
        <KanbanBoard
          tasks={tasksQuery.data?.tasks ?? []}
          agents={agentsQuery.data?.agents ?? []}
          onMove={changeStatus}
          onOpen={(task) => navigate(`/tasks/${task.id}`)}
        />
      ) : (
        <div className="grid gap-3">
          {tasksQuery.data?.tasks.map((task) => (
            <Card key={task.id} className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                  <span className="rounded-full border border-white/20 px-2 py-1 text-xs text-muted-foreground">{task.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>優先度 {task.priority}</span>
                <span>期限 {formatDate(task.dueDate)}</span>
                <Button variant="secondary" size="sm" onClick={() => setEditing(task)}>
                  編集
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/tasks/${task.id}`)}>
                  詳細
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(task.id)}>
                  削除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "タスク編集" : "タスク追加"}
        description="担当エージェント、優先度、添付名までまとめて編集します。"
      >
        {editing ? (
          <TaskEditor
            editing={editing}
            onSubmit={(payload) => saveMutation.mutate(payload)}
            agents={agentsQuery.data?.agents ?? []}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function TaskEditor({
  editing,
  onSubmit,
  agents,
}: {
  editing: Partial<Task>;
  onSubmit: (payload: Partial<Task>) => void;
  agents: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<Partial<Task>>(editing);
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-muted-foreground">
          タイトル
          <Input value={form.title ?? ""} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          担当エージェント
          <Input
            list="task-assignees"
            value={form.assigneeId ?? ""}
            onChange={(event) => setForm({ ...form, assigneeId: event.target.value || null })}
          />
          <datalist id="task-assignees">
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </datalist>
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          ステータス
          <Input value={form.status ?? ""} onChange={(event) => setForm({ ...form, status: event.target.value as Task["status"] })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          優先度
          <Input value={form.priority ?? ""} onChange={(event) => setForm({ ...form, priority: event.target.value as Task["priority"] })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          期限
          <Input type="datetime-local" value={form.dueDate?.slice(0, 16) ?? ""} onChange={(event) => setForm({ ...form, dueDate: event.target.value ? new Date(event.target.value).toISOString() : null })} />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          添付（カンマ区切り）
          <Input
            value={(form.attachments ?? []).join(", ")}
            onChange={(event) => setForm({ ...form, attachments: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })}
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

