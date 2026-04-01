import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline" | "accent" | "destructive" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<Variant, string> = {
  default:
    "bg-foreground text-background hover:opacity-90",
  ghost:
    "bg-transparent text-foreground hover:bg-[var(--glass-bg-subtle)]",
  outline:
    "glass-subtle text-foreground hover:bg-[var(--glass-bg)]",
  accent:
    "glass-accent text-white shadow-[0_4px_16px_rgba(0,122,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,122,255,0.35)]",
  destructive:
    "bg-[#FF3B30] text-white hover:bg-[#E5342B]",
  secondary:
    "glass-subtle text-foreground hover:bg-[var(--glass-bg)]",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-[12px] rounded-[10px]",
  md: "px-4 py-2.5 text-[13px] rounded-[12px]",
  lg: "px-6 py-3 text-[14px] rounded-[14px]",
};

export function Button({ variant = "default", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
