"use client";

import { useEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useStoredValue } from "@/lib/hooks/use-stored-value";
import { Button } from "@/components/ui/button";

type Theme = "system" | "light" | "dark";

const OPTIONS = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

function isTheme(value: string | null): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [stored, setStored] = useStoredValue("theme");
  // Null during SSR and before the stored value is known, so no button claims
  // to be active until it actually is. Anything unrecognised means "system".
  const theme: Theme | null = stored === null ? null : isTheme(stored) ? stored : "system";

  // Follow OS changes while in "system" mode.
  useEffect(() => {
    if (theme !== null && theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, [theme]);

  function choose(next: Theme) {
    setStored(next);
    applyTheme(next);
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
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
