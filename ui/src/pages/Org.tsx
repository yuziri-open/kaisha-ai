import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Agent } from "@/lib/types";
import { Bot, Network } from "lucide-react";

type OrgNode = Agent & { children: OrgNode[] };

function buildTree(agents: Agent[]): OrgNode[] {
  const map = new Map<string, OrgNode>();
  for (const a of agents) map.set(a.id, { ...a, children: [] });
  const roots: OrgNode[] = [];
  for (const a of agents) {
    const node = map.get(a.id)!;
    if (a.reportsToId && map.has(a.reportsToId)) {
      map.get(a.reportsToId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function statusColor(status: string) {
  switch (status) {
    case "稼働中": return "#34C759";
    case "待機": return "#FF9F0A";
    case "注意": return "#FF3B30";
    default: return "#8E8E93";
  }
}

function OrgNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  return (
    <div className="relative">
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute -left-6 top-0 h-7 w-6 border-b-2 border-l-2 border-[var(--glass-border)] rounded-bl-xl" />
      )}

      {/* Card */}
      <div className="glass hover-lift group relative overflow-hidden rounded-[18px] p-4 transition-all">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px]"
            style={{ background: `${node.color ?? "#007AFF"}18` }}
          >
            <Bot size={18} style={{ color: node.color ?? "#007AFF" }} strokeWidth={1.6} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-[14px] font-semibold text-foreground">{node.name}</h4>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: `${statusColor(node.status)}18`,
                  color: statusColor(node.status),
                  border: `1px solid ${statusColor(node.status)}30`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor(node.status) }} />
                {node.status}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">{node.role}</p>
            {node.team && (
              <p className="mt-1 text-[11px] text-[var(--muted)]">チーム: {node.team}</p>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-[var(--glass-border)] pl-6">
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgPage() {
  const query = useQuery({ queryKey: ["agents"], queryFn: api.agents });
  const agents = query.data?.agents ?? [];
  const tree = buildTree(agents);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-[24px] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[rgba(0,122,255,0.1)]">
            <Network size={20} className="text-[#007AFF]" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">組織図</h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              エージェントの報告ラインと階層構造を可視化します。
            </p>
          </div>
        </div>
      </div>

      {/* Org Tree */}
      {tree.length > 0 ? (
        <div className="glass rounded-[24px] p-6">
          <div className="space-y-3">
            {tree.map((root) => (
              <OrgNode key={root.id} node={root} />
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-[24px] p-10 text-center">
          <Network size={32} className="mx-auto mb-3 text-[var(--muted)]" strokeWidth={1.2} />
          <p className="text-[14px] font-medium text-foreground">エージェントが未登録です</p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            エージェント管理からチームメンバーを追加してください。
          </p>
        </div>
      )}
    </div>
  );
}
