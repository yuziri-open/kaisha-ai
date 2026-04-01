import type { Agent } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

type OrgNode = Agent & { children?: OrgNode[] };

function Node({ node }: { node: OrgNode }) {
  return (
    <div className="space-y-3">
      <Card className="rounded-[22px] p-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-[14px] border border-white/25" style={{ background: `${node.color}55` }} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{node.name}</h3>
              <Badge>{node.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{node.role}</p>
          </div>
        </div>
      </Card>
      {node.children?.length ? (
        <div className="ml-6 border-l border-white/20 pl-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {node.children.map((child) => (
              <Node key={child.id} node={child} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function OrgChart({ nodes }: { nodes: OrgNode[] }) {
  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <Node key={node.id} node={node} />
      ))}
    </div>
  );
}

