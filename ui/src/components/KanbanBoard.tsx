import type { Agent, Task, TaskStatus } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { formatDate } from "@/lib/utils";

const columns: TaskStatus[] = ["バックログ", "進行中", "レビュー", "完了"];

const priorityClass: Record<string, string> = {
  低: "bg-white/12",
  中: "bg-sky-500/15 text-sky-100",
  高: "bg-amber-500/18 text-amber-50",
  緊急: "bg-rose-500/22 text-rose-50",
};

export function KanbanBoard({
  tasks,
  agents,
  onMove,
  onOpen,
}: {
  tasks: Task[];
  agents: Agent[];
  onMove: (task: Task, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {columns.map((column) => (
        <div
          key={column}
          className="glass-surface min-h-[380px] rounded-[24px] p-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const taskId = event.dataTransfer.getData("text/plain");
            const task = tasks.find((item) => item.id === taskId);
            if (task) onMove(task, column);
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{column}</h3>
            <Badge>{tasks.filter((task) => task.status === column).length}</Badge>
          </div>

          <div className="space-y-3">
            {tasks
              .filter((task) => task.status === column)
              .map((task) => {
                const assignee = agents.find((agent) => agent.id === task.assigneeId);
                return (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", task.id)}
                    onClick={() => onOpen(task)}
                    className="cursor-grab rounded-[20px] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                      <span className={`rounded-full px-2 py-1 text-[11px] ${priorityClass[task.priority]}`}>{task.priority}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{task.description}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{assignee?.name ?? "未割り当て"}</span>
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

