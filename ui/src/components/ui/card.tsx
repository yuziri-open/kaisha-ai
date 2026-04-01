import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass hover-lift relative overflow-hidden rounded-[24px] p-6",
        className,
      )}
      {...props}
    />
  );
}

export function CardSubtle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-subtle relative overflow-hidden rounded-[16px] p-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardAccent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-accent relative overflow-hidden rounded-[14px] p-5",
        className,
      )}
      {...props}
    />
  );
}
