"use client";

import { Label } from "@/components/ui/label";
import { LOAD_OPTIONS } from "@/lib/check-in/scales";
import { cn } from "@/lib/utils";

type LoadSegmentFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  yesterdayValue?: number | null;
  className?: string;
};

export function LoadSegmentField({
  id,
  label,
  value,
  onChange,
  yesterdayValue,
  className,
}: LoadSegmentFieldProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <Label id={`${id}-label`} className="text-sm font-normal">
        {label}
      </Label>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="grid grid-cols-4 gap-1.5"
      >
        {LOAD_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-11 rounded-lg border px-1 text-xs font-normal transition-colors",
                selected
                  ? "border-info/40 bg-info/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {yesterdayValue != null ? (
        <p className="text-muted-foreground text-xs">
          yesterday {LOAD_OPTIONS.find((o) => o.value === yesterdayValue)?.label ?? yesterdayValue}
        </p>
      ) : null}
    </div>
  );
}
