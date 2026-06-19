import type { EngineReport } from "./analysis-engine";
import type { ConfidenceLabel } from "./analysis-engine";

export type { ConfidenceLabel };

export type InsightFinding = {
  id: string;
  label: ConfidenceLabel;
  n: number;
  sentence: string;
  caveat: string;
  predictor: string;
  outcome: string;
  lagDays: number;
  highLabel: string;
  lowLabel: string;
  highMean: number;
  lowMean: number;
  effectSize?: number;
  ciLow?: number;
  ciHigh?: number;
  qValue?: number;
};

export type EnvelopeBar = {
  loadTier: "lighter" | "moderate" | "heavier";
  crashRatePct: number;
  n: number;
};

export type AnalysisOutput = {
  report: EngineReport;
  confirmatory: InsightFinding[];
  watching: InsightFinding[];
  feed: InsightFinding[];
  envelope: {
    bars: EnvelopeBar[];
    takeaway: string;
  } | null;
  composites: {
    recoveryStrain: number | null;
    loadScore: number | null;
  };
  insufficientData: boolean;
  meta: EngineReport["meta"];
};

export type ExploreQuery = {
  predictor: string;
  outcome: string;
  lagDays: 0 | 1 | 2;
};

export type ExploreResult = {
  blocked: boolean;
  blockReason?: string;
  highLabel?: string;
  lowLabel?: string;
  highMean?: number;
  lowMean?: number;
  n?: number;
};

export const FIELD_OPTIONS = [
  { value: "physical_load", label: "Physical load" },
  { value: "cognitive_load", label: "Cognitive load" },
  { value: "social_load", label: "Social load" },
  { value: "sleep_quality", label: "Sleep quality" },
  { value: "morning_fatigue", label: "Morning fatigue" },
  { value: "evening_fatigue", label: "Evening fatigue" },
  { value: "morning_brain_fog", label: "Morning brain fog" },
  { value: "evening_brain_fog", label: "Evening brain fog" },
  { value: "capacity", label: "Capacity" },
  { value: "pem", label: "PEM feeling" },
  { value: "alcohol", label: "Alcohol" },
  { value: "late_caffeine", label: "Late caffeine" },
  { value: "late_meal", label: "Late meal" },
  { value: "on_period", label: "On period" },
] as const;

export const LOAD_FIELDS = new Set(["physical_load", "cognitive_load", "social_load"]);
