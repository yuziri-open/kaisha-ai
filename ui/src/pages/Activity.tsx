import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Activity as ActivityIcon,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Repeat,
  ShieldCheck,
} from "lucide-react";

const KINDS = [
  { value: undefined, label: "すべて" },
  { value: "routine", label: "ルーティン" },
  { value: "approval", label: "承認" },
  { value: "task", label: "タスク" },
  { value: "agent", label: "エージェント" },
  { value: "cost", label: "コスト" },
] as const;

function kindIcon(kind: string) {
  switch (kind) {
    case "routine":
      return <Repeat size={16} className="text-[var(--accent-teal)]" />;
    case "approval":
      return <ShieldCheck size={16} className="text-[var(--accent-orange)]" />;
    case "task":
      return <ClipboardList size={16} className="text-[var(--accent-blue)]" />;
    case "agent":
      return <Bot size={16} className="text-[var(--accent-purple)]" />;
    case "cost":
      return <CircleDollarSign size={16} className="text-[var(--accent-green)]" />;
    default:
      return <ActivityIcon size={16} className="text-[var(--accent-blue)]" />;
  }
}

function kindColor(kind: string) {
  switch (kind) {
    case "routine":
      return "bg-[rgba(90,200,250,0.12)] text-[var(--accent-teal)] border-[rgba(90,200,250,0.2)]";
    case "approval":
      return "bg-[rgba(255,159,10,0.12)] text-[var(--accent-orange)] border-[rgba(255,159,10,0.2)]";
    case "task":
      return "bg-[rgba(0,122,255,0.12)] text-[var(--accent-blue)] border-[rgba(0,122,255,0.2)]";
    case "agent":
      return "bg-[rgba(175,82,222,0.12)] text-[var(--accent-purple)] border-[rgba(175,82,222,0.2)]";
    case "cost":
      return "bg-[rgba(52,199,89,0.12)] text-[var(--accent-green)] border-[rgba(52,199,89,0.2)]";
    default:
      return "";
  }
}

export function ActivityPage() {
  const [activeKind, setActiveKind] = useState<string | undefined>(undefined);

  const query = useQuery({
    queryKey: ["activities", activeKind],
    queryFn: () => api.activities(activeKind),
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">アクティビティ</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              全アクティビティの時系列ログ — 合計 {total} 件
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]">
            <ActivityIcon size={20} />
          </div>
        </div>
      </Card>

      {/* Kind filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {KINDS.map((kind) => (
          <button
            key={kind.label}
            onClick={() => setActiveKind(kind.value)}
            className={`
              rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 border
              ${
                activeKind === kind.value
                  ? "glass-accent text-white border-transparent shadow-[0_2px_12px_rgba(0,122,255,0.25)]"
                  : "glass-subtle text-muted-foreground border-[var(--glass-border)] hover:text-foreground hover:bg-[var(--glass-bg)]"
              }
            `}
          >
            {kind.label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div className="space-y-3">
        {query.isLoading ? (
          <Card className="p-8 text-center text-muted-foreground">読み込み中…</Card>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">アクティビティがありません</p>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="hover-lift hover-glow p-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)]">
                  {kindIcon(item.kind)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {item.title}
                    </h3>
                    <Badge className={kindColor(item.kind)}>{item.kind}</Badge>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground/70 tabular-nums">
                  {formatDate(item.occurredAt)}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
