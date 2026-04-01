import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { GoalTree } from "@/components/GoalTree";
import { Card } from "@/components/ui/card";

export function GoalsPage() {
  const query = useQuery({ queryKey: ["goals"], queryFn: api.goals });

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-foreground">ゴールツリー</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          会社ゴールからプロジェクトゴール、タスクへと連なる階層を可視化します。
        </p>
      </Card>
      {query.data ? <GoalTree goals={query.data.goals} /> : null}
    </div>
  );
}

