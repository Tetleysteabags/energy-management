"use client";

import { DURATION_PRESETS } from "@/lib/events/types";
import { Button } from "@/components/ui/button";

type DurationPresetPickerProps = {
  value: number | null;
  disabled?: boolean;
  onSelect: (minutes: number) => void;
};

export function DurationPresetPicker({
  value,
  disabled,
  onSelect,
}: DurationPresetPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DURATION_PRESETS.map((preset) => (
        <Button
          key={preset.minutes}
          type="button"
          variant={value === preset.minutes ? "default" : "outline"}
          size="xs"
          className="min-h-8 font-normal"
          disabled={disabled}
          onClick={() => onSelect(preset.minutes)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
