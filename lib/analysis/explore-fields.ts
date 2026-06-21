export type ExploreFieldGroup = "checkin" | "wearable";

export type ExploreFieldOption = {
  value: string;
  label: string;
  group: ExploreFieldGroup;
};

export const EXPLORE_FIELD_GROUP_LABELS: Record<ExploreFieldGroup, string> = {
  checkin: "From check-in",
  wearable: "From wearable",
};

export const EXPLORE_FIELD_OPTIONS: ExploreFieldOption[] = [
  { value: "physical_load", label: "Physical load", group: "checkin" },
  { value: "cognitive_load", label: "Cognitive load", group: "checkin" },
  { value: "social_load", label: "Social load", group: "checkin" },
  { value: "sleep_quality", label: "Sleep quality (how you felt)", group: "checkin" },
  { value: "morning_fatigue", label: "Morning fatigue", group: "checkin" },
  { value: "evening_fatigue", label: "Evening fatigue", group: "checkin" },
  { value: "morning_brain_fog", label: "Morning brain fog", group: "checkin" },
  { value: "evening_brain_fog", label: "Evening brain fog", group: "checkin" },
  { value: "morning_muscle_level", label: "Morning muscle level", group: "checkin" },
  { value: "evening_muscle_level", label: "Evening muscle level", group: "checkin" },
  { value: "capacity", label: "Capacity", group: "checkin" },
  { value: "pem", label: "PEM feeling", group: "checkin" },
  { value: "alcohol", label: "Alcohol", group: "checkin" },
  { value: "late_caffeine", label: "Late caffeine", group: "checkin" },
  { value: "late_meal", label: "Late meal", group: "checkin" },
  { value: "on_period", label: "On period", group: "checkin" },
  { value: "hrv", label: "HRV (overnight)", group: "wearable" },
  { value: "resting_hr", label: "Resting heart rate", group: "wearable" },
  { value: "sleep_duration", label: "Sleep duration", group: "wearable" },
  { value: "sleep_efficiency", label: "Sleep efficiency", group: "wearable" },
  { value: "steps", label: "Steps", group: "wearable" },
];

/** Short explanations shown when a field is selected in Explore. */
export const EXPLORE_FIELD_HINTS: Partial<Record<string, string>> = {
  sleep_quality:
    "How you rated your sleep in the morning check-in — subjective, not from your wearable.",
  morning_muscle_level:
    "Muscle soreness or heaviness you logged in the morning check-in (0–10).",
  evening_muscle_level:
    "Muscle soreness or heaviness you logged in the evening check-in (0–10).",
  hrv:
    "Heart rate variability from your wearable, usually measured overnight. Higher HRV often means more recovery tone for you, but it varies day to day and person to person.",
  resting_hr:
    "Resting heart rate from your wearable — typically the lowest overnight reading attributed to that calendar day.",
  sleep_duration:
    "Total sleep time from your wearable (minutes), not the hours-you-slept field in check-in.",
  sleep_efficiency:
    "Share of time in bed spent asleep, from your wearable (0–100%).",
  steps:
    "Step count from your wearable for that calendar day.",
};

export const EXPLORE_SOURCES_INFO =
  "Check-in fields are how you rated yourself. Wearable fields come from your connected device — usually overnight readings attached to the morning of that date. Explore splits days into higher vs lower and compares outcomes; it does not interpret a single unusual day.";

export function exploreFieldLabel(value: string): string {
  return EXPLORE_FIELD_OPTIONS.find((option) => option.value === value)?.label ?? value.replace(/_/g, " ");
}

export function exploreFieldHints(predictor: string, outcome: string): string[] {
  const hints = [EXPLORE_FIELD_HINTS[predictor], EXPLORE_FIELD_HINTS[outcome]].filter(
    (hint): hint is string => Boolean(hint),
  );
  return [...new Set(hints)];
}
