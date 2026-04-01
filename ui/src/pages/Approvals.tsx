import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["approvals"], queryFn: api.approvals });
  const [comments, setComments] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "承認" | "却下" }) =>
      api.decideApproval(id, decision, comments[id] ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-foreground">承認管理</h2>
        <p className="mt-2 text-sm text-muted-foreground">権限、予算、連携に関する意思決定をここで処理します。</p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {query.data?.approvals.map((approval) => (
          <Card key={approval.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{approval.title}</h3>
                  <Badge>{approval.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {approval.category} / 申請者 {approval.requester}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(approval.requestedAt)}</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{approval.comment}</p>
            <div className="mt-4">
              <Textarea
                value={comments[approval.id] ?? ""}
                onChange={(event) => setComments((current) => ({ ...current, [approval.id]: event.target.value }))}
                placeholder="承認コメント"
                className="min-h-24"
              />
            </div>
            {approval.status === "承認待ち" ? (
              <div className="mt-4 flex gap-3">
                <Button onClick={() => mutation.mutate({ id: approval.id, decision: "承認" })}>承認</Button>
                <Button variant="secondary" onClick={() => mutation.mutate({ id: approval.id, decision: "却下" })}>
                  却下
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

