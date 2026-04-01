import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 backdrop-blur-sm transition-all duration-200 resize-none",
        "focus:border-[#007AFF]/40 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/15",
        "hover:border-[var(--glass-border-inner)]",
        className,
      )}
      {...props}
    />
  );
}
