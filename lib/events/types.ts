export const QUICK_EVENT_TYPES = [
  { type: "rest_break", label: "Rest break", icon: "☕" },
  { type: "nap", label: "Nap", icon: "😴" },
  { type: "walk", label: "Walk", icon: "🚶" },
  { type: "meeting", label: "Meeting", icon: "💬" },
  { type: "supplement", label: "Supplement", icon: "💊" },
] as const;

export type EventRow = {
  id: string;
  occurred_at: string;
  event_type: string;
  label: string;
  duration_minutes: number | null;
  intensity: number | null;
  note: string | null;
};

export function groupEventsByDay(events: EventRow[]): Map<string, EventRow[]> {
  const grouped = new Map<string, EventRow[]>();

  for (const event of events) {
    const day = event.occurred_at.slice(0, 10);
    const list = grouped.get(day) ?? [];
    list.push(event);
    grouped.set(day, list);
  }

  return grouped;
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
