"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addQuickEvent,
  deleteEvent,
  updateEventTimes,
} from "@/app/actions/events";
import { EventRowItem } from "@/components/events/event-row-item";
import { QuickAddBar } from "@/components/events/quick-add-bar";
import { formatLogDateLabel } from "@/lib/check-in/log-date";
import { eventHasDuration, QUICK_EVENT_TYPES, type EventRow } from "@/lib/events/types";

const HOME_EVENT_TYPES = QUICK_EVENT_TYPES.filter(
  (event) => event.type !== "supplement",
);

type TodayEventsCardProps = {
  events: EventRow[];
  logDate: string;
  viewingToday?: boolean;
};

export function TodayEventsCard({
  events,
  logDate,
  viewingToday = true,
}: TodayEventsCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [, startUiTransition] = useTransition();
  const [durationEditId, setDurationEditId] = useState<string | null>(null);

  function refresh(action: () => Promise<unknown>, onDone?: () => void) {
    startTransition(async () => {
      await action();
      onDone?.();
      router.refresh();
    });
  }

  function handleAdd(eventType: string, label: string) {
    refresh(
      async () => {
        const result = await addQuickEvent({ eventType, label, logDate });
        if (result.id && eventHasDuration(eventType)) {
          setDurationEditId(result.id);
        }
      },
      undefined,
    );
  }

  const heading = viewingToday ? "Today" : formatLogDateLabel(logDate);

  return (
    <section className="border-border/60 space-y-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{heading}</h2>
        {events.length > 0 ? (
          <Link href="/events" className="text-muted-foreground text-xs hover:underline">
            Full history
          </Link>
        ) : null}
      </div>

      <QuickAddBar eventTypes={HOME_EVENT_TYPES} compact disabled={pending} onAdd={handleAdd} />

      {events.length ? (
        <ul className="space-y-2">
          {events.map((event) => (
            <EventRowItem
              key={event.id}
              event={event}
              disabled={pending}
              showPresets={durationEditId === event.id}
              onEditDuration={() => startUiTransition(() => setDurationEditId(event.id))}
              onClosePresets={() => startUiTransition(() => setDurationEditId(null))}
              onTimesSave={(occurredAt, durationMinutes) =>
                refresh(() => updateEventTimes(event.id, occurredAt, durationMinutes))
              }
              onRemove={() => refresh(() => deleteEvent(event.id))}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-xs">Tap to log something — optional.</p>
      )}
    </section>
  );
}
