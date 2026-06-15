"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type SliderFieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  wordLabel: string;
  yesterdayValue?: number | null;
  className?: string;
};

export function SliderField({
  id,
  label,
  value,
  onChange,
  wordLabel,
  yesterdayValue,
  className,
}: SliderFieldProps) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-normal">
          {label}
        </Label>
        <span className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
          {value} · {wordLabel}
        </span>
      </div>
      <Slider
        id={id}
        min={0}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(values) => {
          const next = Array.isArray(values) ? values[0] : values;
          onChange(next ?? value);
        }}
        aria-label={label}
        className="[&_[data-slot=slider-thumb]]:size-5"
      />
      {yesterdayValue != null ? (
        <p className="text-muted-foreground text-xs">yesterday {yesterdayValue}</p>
      ) : null}
    </div>
  );
}
