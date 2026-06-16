export const QUICK_EVENT_TYPES = [
  { type: "rest_break", label: "Rest", icon: "☕" },
  { type: "nap", label: "Nap", icon: "😴" },
  { type: "walk", label: "Walk", icon: "🚶" },
  { type: "workout", label: "Workout", icon: "🏋️" },
  { type: "meeting", label: "Meeting", icon: "💬" },
  { type: "work", label: "Work", icon: "💻" },
  { type: "symptom_flare", label: "Flare", icon: "⚡" },
  { type: "supplement", label: "Supplement", icon: "💊" },
] as const;

/** Event type that opens a sub-picker before logging. */
export const WORKOUT_TYPE = "workout";

/** Preset workout kinds; users can also enter their own via "Other". */
export const WORKOUT_SUBTYPES = ["Climbing", "Stretching", "Weights", "Yoga"] as const;

/** Events with no duration (point-in-time). */
export const POINT_EVENT_TYPES = new Set(["supplement", "symptom_flare"]);

export const DURATION_PRESETS = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "1h30", minutes: 90 },
  { label: "2h", minutes: 120 },
  { label: "3h", minutes: 180 },
] as const;

/** Default duration when quick-adding (minutes). */
export const DEFAULT_EVENT_DURATION: Record<string, number | null> = {
  rest_break: 15,
  nap: 30,
  walk: 30,
  workout: 60,
  meeting: 60,
  work: 120,
  supplement: null,
  symptom_flare: null,
};

export function eventHasDuration(eventType: string): boolean {
  return !POINT_EVENT_TYPES.has(eventType);
}

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

export function formatEventDuration(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return "";
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
}
