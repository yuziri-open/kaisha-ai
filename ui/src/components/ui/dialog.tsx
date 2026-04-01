import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(8,12,20,0.42)] backdrop-blur-md">
      <div className="flex min-h-screen items-start justify-center p-4 sm:items-center sm:p-6">
        <div className="glass my-8 w-full max-w-3xl overflow-hidden rounded-[28px] border border-[var(--glass-border)] shadow-[0_20px_80px_rgba(15,23,42,0.18)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-6 py-5">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
            </div>
            <Button variant="ghost" onClick={onClose} className="shrink-0">
              閉じる
            </Button>
          </div>
          <div className="max-h-[min(72vh,900px)] overflow-y-auto px-6 py-6 sm:max-h-[calc(100vh-180px)]">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
