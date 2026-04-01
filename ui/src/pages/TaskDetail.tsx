import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function TaskDetailPage() {
  const params = useParams<{ taskId: string }>();
  const query = useQuery({
    queryKey: ["task", params.taskId],
    queryFn: () => api.task(params.taskId ?? ""),
    enabled: Boolean(params.taskId),
  });

  if (!query.data) {
    return <div className="glass-panel rounded-[28px] p-8 text-sm text-muted-foreground">タスク詳細を読み込み中です...</div>;
  }

  const task = query.data;
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-foreground">{task.title}</h2>
          <Badge>{task.status}</Badge>
          <Badge>{task.priority}</Badge>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{task.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>期限 {formatDate(task.dueDate)}</span>
          <span>更新 {formatDate(task.updatedAt)}</span>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h3 className="text-xl font-semibold text-foreground">コメント</h3>
          <div className="mt-4 space-y-3">
            {task.comments.map((comment) => (
              <div key={comment.id} className="rounded-[18px] border border-white/12 bg-white/8 p-4">
                <p className="text-sm font-medium text-foreground">{comment.author}</p>
                <p className="mt-2 text-sm text-muted-foreground">{comment.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-xl font-semibold text-foreground">ワークログ / 添付</h3>
          <div className="mt-4 space-y-3">
            {task.worklogs.map((log) => (
              <div key={log.id} className="rounded-[18px] border border-white/12 bg-white/8 p-4">
                <p className="text-sm font-medium text-foreground">{log.summary}</p>
                <p className="mt-2 text-sm text-muted-foreground">{log.minutes} 分</p>
              </div>
            ))}
            <div className="rounded-[18px] border border-white/12 bg-white/8 p-4">
              <p className="text-sm font-medium text-foreground">添付ファイル</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {task.attachments.map((attachment) => (
                  <Badge key={attachment}>{attachment}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

