import { BellDot, Bot, ClipboardList, Coins, Flag, Gauge, Network, Repeat, Settings2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const items = [
  { to: "/", label: "ダッシュボード", icon: Gauge, end: true },
  { to: "/agents", label: "エージェント", icon: Bot },
  { to: "/tasks", label: "タスク", icon: ClipboardList },
  { to: "/goals", label: "ゴール", icon: Flag },
  { to: "/org", label: "組織図", icon: Network },
  { to: "/routines", label: "ルーティン", icon: Repeat },
  { to: "/costs", label: "コスト", icon: Coins },
  { to: "/approvals", label: "承認", icon: BellDot },
  { to: "/settings", label: "設定", icon: Settings2 },
];

export function Sidebar() {
  return (
    <aside className="glass sticky top-5 flex h-[calc(100vh-40px)] w-full max-w-[280px] flex-col rounded-[28px] p-5">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]">
            <span className="text-lg font-bold">K</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">KAISHA</h1>
            <p className="text-[11px] tracking-[0.08em] text-muted-foreground">AI オーケストレーター</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              end={item.end}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-[14px] px-4 py-2.5 text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "nav-pill-active text-foreground backdrop-blur-sm"
                    : "text-muted-foreground hover:bg-[var(--glass-bg-subtle)] hover:text-foreground",
                )
              }
            >
              <Icon size={17} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">テーマ</p>
          <ThemeToggle />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          エージェントチャットは各エージェント詳細から開けます。
        </p>
      </div>

      <p className="mt-4 text-center text-[10px] text-muted-foreground/50">v0.1 Liquid Glass</p>
    </aside>
  );
}
