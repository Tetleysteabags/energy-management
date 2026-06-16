import type { InsightFinding } from "./types";

/**
 * Present-tense pacing notes for the home screen.
 *
 * Hard rails (see chat decision, 2026-06-16):
 * - Forward-looking heads-ups are reframed as PRESENT-TENSE agency, never a
 *   tomorrow-prediction ("an easy evening tends to help", never "you'll crash").
 * - Heads-ups fire only from CONFIRMED recurring patterns, never possible/
 *   exploratory ones — otherwise we'd forecast from noise.
 * - Probabilistic humility only ("tends to", "often"). No verdicts.
 * - Fire sparingly: only when today's input is genuinely high on that predictor,
 *   at most one note a day. The card itself is dismissible.
 * - Recovery read stays qualitative — recoveryStrain is a demoted heuristic, so
 *   we never surface the number, and a good recovery stays neutral (no nudge to
 *   do more).
 */

/** Minutes of meeting load today before the heads-up is allowed to fire. */
const MEETING_MINUTES_HIGH = 120;
/** Minutes of active/physical load today before the heads-up is allowed to fire. */
const ACTIVE_MINUTES_HIGH = 60;
/** recoveryStrain (0–100, higher = more strain) above which we flag a lower-recovery night. */
const RECOVERY_STRAIN_ELEVATED = 65;

export type PacingTodayInput = {
  meetingMinutes: number;
  activeMinutes: number;
};

export type PacingNote = {
  kind: "load" | "recovery";
  message: string;
};

function hasConfirmedPredictor(confirmed: InsightFinding[], predictor: string): boolean {
  return confirmed.some(
    (finding) => finding.label === "recurring_pattern" && finding.predictor === predictor,
  );
}

/** #1 — today's load is genuinely high AND a confirmed pattern backs it up. */
function loadHeadsUp(
  confirmed: InsightFinding[],
  today: PacingTodayInput,
): PacingNote | null {
  const meetingHigh =
    today.meetingMinutes >= MEETING_MINUTES_HIGH &&
    hasConfirmedPredictor(confirmed, "meeting_load_score");
  const physicalHigh =
    today.activeMinutes >= ACTIVE_MINUTES_HIGH &&
    hasConfirmedPredictor(confirmed, "physical_load_score");

  // Pick whichever is further past its own threshold so the note matches the
  // bigger driver of the day.
  const meetingOver = meetingHigh ? today.meetingMinutes / MEETING_MINUTES_HIGH : 0;
  const physicalOver = physicalHigh ? today.activeMinutes / ACTIVE_MINUTES_HIGH : 0;

  if (meetingHigh && meetingOver >= physicalOver) {
    return {
      kind: "load",
      message: "Today's been meeting-heavy. On days like this, an easy evening tends to help.",
    };
  }
  if (physicalHigh) {
    return {
      kind: "load",
      message:
        "You've been more active than usual today. On busier days, an easy evening tends to help.",
    };
  }
  return null;
}

/** #2 — qualitative recovery read. Neutral (null) when recovery is fine. */
function recoveryNote(
  recoveryStrain: number | null,
  fallbackLowCapacity: boolean,
): PacingNote | null {
  const elevated =
    recoveryStrain != null ? recoveryStrain >= RECOVERY_STRAIN_ELEVATED : fallbackLowCapacity;

  if (!elevated) return null;

  return {
    kind: "recovery",
    message: "Recovery looked a bit lower last night — a gentler day tends to help.",
  };
}

/**
 * At most one calm note per day. A specific "today's load" heads-up takes
 * priority over the general recovery read; otherwise nothing shows.
 */
export function buildPacingNote(args: {
  confirmed: InsightFinding[];
  today: PacingTodayInput;
  recoveryStrain: number | null;
  /** Used only when no wearable recovery composite is available yet. */
  fallbackLowCapacity?: boolean;
}): PacingNote | null {
  return (
    loadHeadsUp(args.confirmed, args.today) ??
    recoveryNote(args.recoveryStrain, args.fallbackLowCapacity ?? false)
  );
}
