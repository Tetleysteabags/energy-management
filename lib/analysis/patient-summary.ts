import type { ConfidenceLabel, Hypothesis } from "./analysis-engine";

type PhraseTier = {
  recurring: string;
  possible: string;
};

/** Patient-facing sentences — no statistics. Doctor view uses engine `plainEnglish`. */
const HYPOTHESIS_PHRASES: Record<string, PhraseTier> = {
  H1a: {
    recurring: "Busy meeting days tend to be followed by lower-energy days.",
    possible: "Meeting-heavy days might be worth watching for next-day fatigue.",
  },
  H1b: {
    recurring: "Heavy meeting days sometimes show up before tougher PEM days.",
    possible: "Meeting load might be linked to how PEM feels the next day.",
  },
  H2: {
    recurring: "Nights you slept worse often line up with harder mornings.",
    possible: "Poor sleep might be showing up in next-day fatigue.",
  },
  H3: {
    recurring: "Irritating environment days tend to precede rougher sleep.",
    possible: "Sinus or environment irritation might be affecting sleep.",
  },
  H4a: {
    recurring: "Alcohol evenings often show up before higher resting heart rate.",
    possible: "Alcohol might be linked to a higher resting HR the next day.",
  },
  H4b: {
    recurring: "Alcohol evenings often line up with lower HRV the next morning.",
    possible: "Alcohol might be worth watching for next-day HRV.",
  },
  H4c: {
    recurring: "Alcohol evenings tend to precede shorter sleep.",
    possible: "Alcohol might be affecting how long you sleep.",
  },
  H5: {
    recurring: "Heavier physical days sometimes show up before tougher PEM days.",
    possible: "Physical load might be linked to next-day PEM.",
  },
};

const CASE_CONTROL_PHRASES: Record<string, string> = {
  physical_load_score: "Before crash days, physical load tended to run higher than usual.",
  steps: "Before crash days, step counts tended to run higher than usual.",
  meeting_load_score: "Before crash days, meeting load sometimes ran higher than usual.",
  hrv_rmssd: "Before crash days, HRV sometimes ran lower than usual.",
  resting_hr: "Before crash days, resting heart rate sometimes ran higher than usual.",
  total_sleep_minutes: "Before crash days, sleep sometimes ran shorter than usual.",
};

function humanizeField(field: string): string {
  return field.replace(/_/g, " ");
}

export function patientSummary(
  hypothesis: Pick<Hypothesis, "id" | "label">,
  label: ConfidenceLabel,
): string {
  const phrases = HYPOTHESIS_PHRASES[hypothesis.id];

  if (label === "recurring_pattern" && phrases?.recurring) {
    return phrases.recurring;
  }
  if (label === "possible_association" && phrases?.possible) {
    return phrases.possible;
  }
  if (label === "insufficient_data" || label === "no_signal") {
    return `Still collecting data on ${hypothesis.label.toLowerCase()}.`;
  }

  return `A possible link between ${humanizeField(hypothesis.id)} patterns — still watching.`;
}

export function patientCaseControlSummary(signal: string): string {
  return (
    CASE_CONTROL_PHRASES[signal] ??
    `Before crash days, ${humanizeField(signal)} sometimes looked different than usual.`
  );
}
