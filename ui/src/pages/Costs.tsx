import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Card } from "@/components/ui/card";
import { formatCurrency, percent } from "@/lib/utils";

export function CostsPage() {
  const query = useQuery({ queryKey: ["costs"], queryFn: api.costs });

  if (!query.data) {
    return <div className="glass-panel rounded-[28px] p-8 text-sm text-muted-foreground">コストを読み込み中です...</div>;
  }

  const spentPercent = percent(query.data.spent, query.data.budget);
  const points = buildLinePoints(query.data.trend.map((item) => item.value));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">今月予算</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{formatCurrency(query.data.budget)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">消化額</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{formatCurrency(query.data.spent)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">残額</p>
          <p className="mt-3 text-3xl font-semibold text-foreground">{formatCurrency(query.data.remaining)}</p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">コスト推移</h2>
              <p className="mt-2 text-sm text-muted-foreground">月次予算に対する推移を簡易グラフで表示します。</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">予算消化率</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{spentPercent}%</p>
            </div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-white/10">
            <div className="h-3 rounded-full bg-[linear-gradient(90deg,#34C759,#007AFF,#D946EF)]" style={{ width: `${spentPercent}%` }} />
          </div>
          <div className="mt-6">
            <svg viewBox="0 0 420 180" className="line-chart h-56 w-full">
              <defs>
                <linearGradient id="cost-line" x1="0%" x2="100%">
                  <stop offset="0%" stopColor="#34C759" />
                  <stop offset="55%" stopColor="#007AFF" />
                  <stop offset="100%" stopColor="#D946EF" />
                </linearGradient>
              </defs>
              <path d={points} stroke="url(#cost-line)" />
            </svg>
            <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-muted-foreground md:grid-cols-6">
              {query.data.trend.map((item) => (
                <span key={item.month}>{item.month}</span>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-foreground">エージェント別コスト</h2>
          <div className="mt-5 space-y-4">
            {query.data.breakdown.map((item) => (
              <div key={item.agentId}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-foreground">{item.agentName}</span>
                  <span className="text-muted-foreground">{formatCurrency(item.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${percent(item.amount, query.data.spent)}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function buildLinePoints(values: number[]) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 400 + 10;
      const y = 160 - (value / max) * 130;
      return `${index === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");
}

