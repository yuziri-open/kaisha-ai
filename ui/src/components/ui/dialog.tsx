import type { ReactNode } from "react";
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,12,20,0.42)] px-4 backdrop-blur-sm">
      <div className="glass-panel max-h-[90vh] w-full max-w-2xl overflow-auto rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="ghost" onClick={onClose}>
            閉じる
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

