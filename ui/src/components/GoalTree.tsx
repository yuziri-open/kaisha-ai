import type { Goal } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

function GoalNode({ goal, depth = 0 }: { goal: Goal; depth?: number }) {
  return (
    <div className="space-y-3">
      <Card className="rounded-[22px] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge>{goal.level}</Badge>
              <span className="text-xs text-muted-foreground">{goal.status}</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-foreground">{goal.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{goal.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-foreground">{goal.progress}%</p>
            <p className="text-xs text-muted-foreground">{goal.owner}</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-white/10">
          <div className="h-2 rounded-full bg-[linear-gradient(90deg,#007AFF,#D946EF)]" style={{ width: `${goal.progress}%` }} />
        </div>
      </Card>

      {goal.children.length ? (
        <div className="ml-4 border-l border-white/15 pl-4">
          <div className={`space-y-3 ${depth === 0 ? "lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0" : ""}`}>
            {goal.children.map((child) => (
              <GoalNode key={child.id} goal={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function GoalTree({ goals }: { goals: Goal[] }) {
  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <GoalNode key={goal.id} goal={goal} />
      ))}
    </div>
  );
}

