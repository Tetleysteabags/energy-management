"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addQuickEvent,
  deleteEvent,
  updateEventTimes,
} from "@/app/actions/events";
import { EventRowItem } from "@/components/events/event-row-item";
import { QuickAddBar } from "@/components/events/quick-add-bar";
import {
  eventHasDuration,
  groupEventsByDay,
  QUICK_EVENT_TYPES,
  type EventRow,
} from "@/lib/events/types";

type EventsManagerProps = {
  events: EventRow[];
  timeZone: string;
};

function formatDayHeading(day: string): string {
  // Fixed to UTC so the heading names the day it was given, not a shifted one.
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function EventsManager({ events, timeZone }: EventsManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [durationEditId, setDurationEditId] = useState<string | null>(null);

  const grouped = groupEventsByDay(events, timeZone);
  const days = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

  function refresh(action: () => Promise<unknown>, onDone?: () => void) {
    startTransition(async () => {
      await action();
      onDone?.();
      router.refresh();
    });
  }

  function handleAdd(eventType: string, label: string) {
    refresh(async () => {
      const result = await addQuickEvent({ eventType, label });
      if (result.id && eventHasDuration(eventType)) {
        setDurationEditId(result.id);
      }
    });
  }

  return (
    <div className="space-y-6">
      <QuickAddBar eventTypes={QUICK_EVENT_TYPES} disabled={pending} onAdd={handleAdd} />

      {days.length ? (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day} className="space-y-2">
              <h2 className="text-muted-foreground text-xs font-medium" suppressHydrationWarning>
                {formatDayHeading(day)}
              </h2>
              <ul className="space-y-2">
                {grouped.get(day)?.map((event) => (
                  <EventRowItem
                    timeZone={timeZone}
                    key={event.id}
                    event={event}
                    disabled={pending}
                    showPresets={durationEditId === event.id}
                    onEditDuration={() => setDurationEditId(event.id)}
                    onClosePresets={() => setDurationEditId(null)}
                    onTimesSave={(occurredAt, durationMinutes) =>
                      refresh(() => updateEventTimes(event.id, occurredAt, durationMinutes))
                    }
                    onRemove={() => refresh(() => deleteEvent(event.id))}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing logged yet — that&apos;s fine.</p>
      )}
    </div>
  );
}
