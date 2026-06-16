"use client";

import { DurationPresetPicker } from "@/components/events/duration-preset-picker";
import {
  DEFAULT_EVENT_DURATION,
  eventHasDuration,
  formatEventDuration,
  formatEventTime,
  QUICK_EVENT_TYPES,
  type EventRow,
} from "@/lib/events/types";
import { Button } from "@/components/ui/button";

export function EventRowItem({
  event,
  disabled,
  showPresets,
  showTime = true,
  onEditDuration,
  onClosePresets,
  onDurationSelect,
  onRemove,
}: {
  event: EventRow;
  disabled: boolean;
  showPresets: boolean;
  /** Show the time of day (true on the home Today card and per-day history). */
  showTime?: boolean;
  onEditDuration: () => void;
  onClosePresets: () => void;
  onDurationSelect: (minutes: number) => void;
  onRemove: () => void;
}) {
  const icon =
    QUICK_EVENT_TYPES.find((item) => item.type === event.event_type)?.icon ?? "•";
  const hasDuration = eventHasDuration(event.event_type);
  const minutes = event.duration_minutes;
  const durationLabel = formatEventDuration(minutes);

  return (
    <li className="border-border/60 space-y-2 rounded-lg border px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span aria-hidden className="mr-1.5">
              {icon}
            </span>
            {event.label}
            {hasDuration && durationLabel ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground ml-1 underline-offset-2 hover:underline"
                onClick={onEditDuration}
              >
                · {durationLabel}
              </button>
            ) : null}
          </p>
          {showTime ? (
            <p className="text-muted-foreground text-xs" suppressHydrationWarning>
              {formatEventTime(event.occurred_at)}
            </p>
          ) : null}
          {event.note ? (
            <p className="text-muted-foreground mt-1 text-xs">{event.note}</p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="text-muted-foreground shrink-0"
          disabled={disabled}
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>

      {hasDuration && showPresets ? (
        <>
          <DurationPresetPicker
            value={minutes ?? DEFAULT_EVENT_DURATION[event.event_type] ?? null}
            disabled={disabled}
            onSelect={onDurationSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground h-auto px-0 py-0 text-xs"
            onClick={onClosePresets}
          >
            Done
          </Button>
        </>
      ) : null}
    </li>
  );
}
