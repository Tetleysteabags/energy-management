"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function ThemeToggle() {
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

  // Follow OS changes while in "system" mode.
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

  return (
    <div className="flex gap-2">
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
