export const QUICK_EVENT_TYPES = [
  { type: "rest_break", label: "Rest", icon: "☕" },
  { type: "nap", label: "Nap", icon: "😴" },
  { type: "walk", label: "Walk", icon: "🚶" },
  { type: "light_activity", label: "Light activity", icon: "🏡" },
  { type: "workout", label: "Workout", icon: "🏋️" },
  { type: "meeting", label: "Calls", icon: "📞" },
  { type: "work", label: "Cognitive work", icon: "💻" },
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
  light_activity: 30,
  workout: 60,
  meeting: 60,
  work: 120,
  supplement: null,
  symptom_flare: null,
};

export function eventHasDuration(eventType: string): boolean {
  return !POINT_EVENT_TYPES.has(eventType);
}

export function eventTypeLabel(eventType: string, fallbackLabel?: string): string {
  const match = QUICK_EVENT_TYPES.find((item) => item.type === eventType);
  return match?.label ?? fallbackLabel ?? eventType;
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

export function formatEventTimeRange(occurredAt: string, durationMinutes: number | null): string {
  const start = formatEventTime(occurredAt);
  if (durationMinutes == null || durationMinutes <= 0) return start;
  const end = new Date(new Date(occurredAt).getTime() + durationMinutes * 60_000);
  return `${start} – ${formatEventTime(end.toISOString())}`;
}

/** `HH:mm` for a datetime-local style input from an ISO timestamp. */
export function isoToTimeInputValue(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Build ISO occurred_at from today's date (or event date) + `HH:mm`. */
export function timeInputToIso(baseIso: string, timeValue: string): string {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date(baseIso);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function minutesBetween(startIso: string, endIso: string): number {
  const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.round(diff / 60_000));
}
