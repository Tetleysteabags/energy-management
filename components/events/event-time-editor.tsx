"use client";

import { useState } from "react";
import { DurationPresetPicker } from "@/components/events/duration-preset-picker";
import {
  DEFAULT_EVENT_DURATION,
  isoToTimeInputValue,
  minutesBetween,
  timeInputToIso,
  type EventRow,
} from "@/lib/events/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EventTimeEditorProps = {
  event: EventRow;
  disabled?: boolean;
  onSave: (occurredAt: string, durationMinutes: number | null) => void;
};

function endTimeFromEvent(event: EventRow): string {
  const minutes = event.duration_minutes ?? DEFAULT_EVENT_DURATION[event.event_type] ?? 30;
  const end = new Date(new Date(event.occurred_at).getTime() + minutes * 60_000);
  return isoToTimeInputValue(end.toISOString());
}

export function EventTimeEditor({ event, disabled, onSave }: EventTimeEditorProps) {
  const [startTime, setStartTime] = useState(() => isoToTimeInputValue(event.occurred_at));
  const [endTime, setEndTime] = useState(() => endTimeFromEvent(event));

  function commit(start: string, end: string) {
    const occurredAt = timeInputToIso(event.occurred_at, start);
    const endIso = timeInputToIso(event.occurred_at, end);
    const duration = minutesBetween(occurredAt, endIso);
    onSave(occurredAt, duration > 0 ? duration : null);
  }

  function handleStartChange(value: string) {
    setStartTime(value);
    const occurredAt = timeInputToIso(event.occurred_at, value);
    const prevDuration =
      event.duration_minutes ?? DEFAULT_EVENT_DURATION[event.event_type] ?? 30;
    const end = new Date(new Date(occurredAt).getTime() + prevDuration * 60_000);
    const nextEnd = isoToTimeInputValue(end.toISOString());
    setEndTime(nextEnd);
    commit(value, nextEnd);
  }

  function handleEndChange(value: string) {
    setEndTime(value);
    commit(startTime, value);
  }

  function handlePreset(minutes: number) {
    const occurredAt = timeInputToIso(event.occurred_at, startTime);
    const end = new Date(new Date(occurredAt).getTime() + minutes * 60_000);
    const nextEnd = isoToTimeInputValue(end.toISOString());
    setEndTime(nextEnd);
    onSave(occurredAt, minutes);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`start-${event.id}`} className="text-muted-foreground text-xs">
            Start
          </Label>
          <Input
            id={`start-${event.id}`}
            type="time"
            value={startTime}
            disabled={disabled}
            className="min-h-9"
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`end-${event.id}`} className="text-muted-foreground text-xs">
            End
          </Label>
          <Input
            id={`end-${event.id}`}
            type="time"
            value={endTime}
            disabled={disabled}
            className="min-h-9"
            onChange={(e) => handleEndChange(e.target.value)}
          />
        </div>
      </div>
      <DurationPresetPicker
        value={event.duration_minutes ?? DEFAULT_EVENT_DURATION[event.event_type] ?? null}
        disabled={disabled}
        onSelect={handlePreset}
      />
    </div>
  );
}
