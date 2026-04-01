import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="glass-surface inline-flex rounded-full p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-4 py-2 text-sm transition",
            value === option.value
              ? "bg-white/30 text-foreground shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

