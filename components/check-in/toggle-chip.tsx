"use client";

import { cn } from "@/lib/utils";

type ToggleChipProps = {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  className?: string;
};

export function ToggleChip({ label, pressed, onPressedChange, className }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "min-h-11 rounded-lg border px-4 text-sm font-normal transition-colors",
        pressed
          ? "border-info/40 bg-info/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/50",
        className,
      )}
    >
      {label}
    </button>
  );
}
