"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Theme = "system" | "light" | "dark";

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

function isDarkAppearance(theme: Theme): boolean {
  return theme === "dark" || (theme === "system" && prefersDark());
}

function useThemeState() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setTheme(stored);
      }
    } catch {
      // localStorage unavailable — keep the default.
    }
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function choose(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore persistence failures
    }
    applyTheme(next);
  }

  return { theme, mounted, choose };
}

type ThemeToggleProps = {
  variant?: "full" | "compact";
  className?: string;
};

export function ThemeToggle({ variant = "full", className }: ThemeToggleProps) {
  const { theme, mounted, choose } = useThemeState();

  if (variant === "compact") {
    const dark = mounted ? isDarkAppearance(theme) : false;

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("text-muted-foreground size-9 min-h-9 shrink-0", className)}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => choose(dark ? "light" : "dark")}
      >
        {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </Button>
    );
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <Button
            key={value}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            className="min-h-10 flex-1 gap-1.5 font-normal"
            aria-pressed={active}
            onClick={() => choose(value)}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Button>
        );
      })}
    </div>
  );
}
