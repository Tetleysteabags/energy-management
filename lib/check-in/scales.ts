/** Plain-word labels per ui-ux-spec.md */

export function symptomWord(value: number): string {
  if (value <= 0) return "none";
  if (value <= 2) return "minimal";
  if (value <= 4) return "mild";
  if (value <= 6) return "moderate";
  if (value <= 8) return "high";
  return "severe";
}

export function capacityWord(value: number): string {
  if (value <= 0) return "very low";
  if (value <= 2) return "low";
  if (value <= 4) return "reduced";
  if (value <= 6) return "moderate";
  if (value <= 8) return "good";
  return "full";
}

export function sleepWord(value: number): string {
  if (value <= 2) return "poor";
  if (value <= 4) return "rough";
  if (value <= 6) return "okay";
  if (value <= 8) return "good";
  return "great";
}

export const LOAD_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "Light" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Heavy" },
] as const;

export const BASELINE_TARGET_DAYS = 28;
