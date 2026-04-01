import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--glass-border)] bg-[var(--glass-bg)] text-muted-foreground transition-all duration-200 hover:bg-[var(--glass-bg-strong)] hover:text-foreground"
      title={theme === "light" ? "ダークモードに切替" : "ライトモードに切替"}
    >
      {theme === "light" ? (
        <Moon size={14} strokeWidth={1.8} />
      ) : (
        <Sun size={14} strokeWidth={1.8} />
      )}
    </button>
  );
}
