import { useToast } from "@/context/ToastContext";
import { X, Bell, CheckCircle2, MessageSquare, ShieldCheck } from "lucide-react";

function kindIcon(kind?: string) {
  switch (kind) {
    case "chat":
      return <MessageSquare size={16} className="text-[var(--accent-blue)]" />;
    case "run":
      return <CheckCircle2 size={16} className="text-[var(--accent-green)]" />;
    case "approval":
      return <ShieldCheck size={16} className="text-[var(--accent-orange)]" />;
    default:
      return <Bell size={16} className="text-[var(--accent-purple)]" />;
  }
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-3 max-w-sm">
      {toasts.map((item) => (
        <div
          key={item.id}
          className="glass-strong hover-lift animate-toast-in flex items-start gap-3 rounded-[16px] p-4 pr-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          style={{ minWidth: 280 }}
        >
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)]">
            {kindIcon(item.kind)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(item.id)}
            className="mt-0.5 rounded-full p-1 text-muted-foreground/60 hover:text-foreground hover:bg-[var(--glass-bg-subtle)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
