import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, LoaderCircle, XCircle } from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardSubtle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

function iconFor(status: string) {
  if (status === "completed") return <CheckCircle2 size={16} className="text-emerald-500" />;
  if (status === "running") return <LoaderCircle size={16} className="animate-spin text-[#007AFF]" />;
  if (status === "failed") return <XCircle size={16} className="text-red-500" />;
  return <Circle size={16} className="text-muted-foreground" />;
}

export function WorkflowRunPage() {
  const params = useParams<{ runId: string; id: string }>();
  const query = useQuery({ queryKey: ["workflow-run", params.runId], queryFn: () => api.workflowRun(params.runId ?? ""), enabled: Boolean(params.runId) });

  if (!query.data) {
    return <div className="glass rounded-[28px] p-8 text-sm text-muted-foreground">ワークフロー実行を読み込み中です...</div>;
  }

  const run = query.data;

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <Link to="/workflows" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> ワークフロー一覧へ戻る
        </Link>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">ワークフロー実行</h2>
            <p className="mt-2 text-sm text-muted-foreground">開始: {formatDate(run.startedAt || run.createdAt)}</p>
          </div>
          <Badge>{run.status}</Badge>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-foreground">入力</h3>
        <CardSubtle className="mt-3 whitespace-pre-wrap p-4 text-sm text-foreground">{run.input || "(空)"}</CardSubtle>
      </Card>

      <div className="space-y-4">
        {run.results.map((result) => (
          <Card key={result.stepIndex} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {iconFor(result.status)}
                <h3 className="text-lg font-semibold text-foreground">STEP {result.stepIndex + 1}</h3>
              </div>
              <Badge>{result.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">agentId: {result.agentId}</p>
            <CardSubtle className="mt-4 whitespace-pre-wrap p-4 text-sm text-foreground">{result.output || "(出力なし)"}</CardSubtle>
          </Card>
        ))}
      </div>
    </div>
  );
}
