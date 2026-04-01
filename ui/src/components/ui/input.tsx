import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[12px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 backdrop-blur-sm transition-all duration-200",
        "focus:border-[#007AFF]/40 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/15",
        "hover:border-[var(--glass-border-inner)]",
        className,
      )}
      {...props}
    />
  );
}
