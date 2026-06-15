/** Clay → teal capacity heatmap scale (ui-ux-spec.md) */
export const CAPACITY_COLORS = [
  "#F0997B",
  "#F5C4B3",
  "#D3D1C7",
  "#9FE1CB",
  "#5DCAA5",
] as const;

export function capacityColor(capacity: number | null | undefined): string {
  if (capacity == null) return "transparent";
  const index = Math.min(
    CAPACITY_COLORS.length - 1,
    Math.max(0, Math.round((capacity / 10) * (CAPACITY_COLORS.length - 1))),
  );
  return CAPACITY_COLORS[index];
}

export function capacitySummarySentence(
  recent: { logDate: string; capacity: number | null }[],
): string {
  const withCapacity = recent.filter((day) => day.capacity != null);
  if (withCapacity.length < 7) {
    return "Keep logging — a clearer picture builds over a few weeks.";
  }

  const half = Math.floor(withCapacity.length / 2);
  const firstHalf = withCapacity.slice(0, half);
  const secondHalf = withCapacity.slice(half);

  const avg = (days: typeof withCapacity) =>
    days.reduce((sum, day) => sum + (day.capacity ?? 0), 0) / days.length;

  const diff = avg(secondHalf) - avg(firstHalf);
  if (Math.abs(diff) < 0.4) return "Capacity has been fairly steady lately.";
  if (diff > 0) return "A bit steadier than the stretch before.";
  return "A tougher stretch than the weeks before — that's data, not a verdict.";
}

export function formatDaySummary(day: {
  logDate: string;
  capacity: number | null;
  eveningFatigue: number | null;
  isCrash: boolean;
}): string {
  if (day.capacity == null) {
    return "No entry — that's fine.";
  }
  const parts = [`Capacity ${day.capacity}/10`];
  if (day.eveningFatigue != null) parts.push(`fatigue ${day.eveningFatigue}`);
  if (day.isCrash) parts.push("marked crash day");
  return parts.join(", ");
}
