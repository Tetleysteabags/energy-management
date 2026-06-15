import type { DailyFrame } from "./analysis-engine";
import {
  ENGINE_LOAD_FIELDS,
  uiFieldToEngine,
} from "./db-frame";
import type { ExploreQuery, ExploreResult } from "./types";

const SYMPTOM_FIELDS = new Set([
  "fatigue_score",
  "pem_score",
  "brain_fog_score",
  "subjective_sleep_quality",
  "overall_capacity_score",
]);

function isLoadField(field: string): boolean {
  return ENGINE_LOAD_FIELDS.has(field);
}

function isSymptomField(field: string): boolean {
  return SYMPTOM_FIELDS.has(field);
}

export function runExploreQueryOnFrame(
  frame: DailyFrame,
  query: ExploreQuery,
): ExploreResult {
  const predictor = uiFieldToEngine(query.predictor);
  const outcome = uiFieldToEngine(query.outcome);
  const { lagDays } = query;

  if (lagDays === 0 && isLoadField(predictor) && isSymptomField(outcome)) {
    return {
      blocked: true,
      blockReason:
        "On rough days you often do less, so same-day activity → symptom can look backwards — try the next day instead.",
    };
  }

  const predictorSeries = frame.getSeries(predictor);
  const outcomeSeries = frame.getSeries(outcome);
  const pairs: { predictor: number; outcome: number }[] = [];

  for (let index = lagDays; index < outcomeSeries.length; index += 1) {
    const predictorValue = predictorSeries[index - lagDays];
    const outcomeValue = outcomeSeries[index];
    if (predictorValue == null || outcomeValue == null) continue;
    pairs.push({ predictor: predictorValue, outcome: outcomeValue });
  }

  if (pairs.length < 4) {
    return {
      blocked: false,
      highMean: 0,
      lowMean: 0,
      highLabel: "Higher predictor days",
      lowLabel: "Lower predictor days",
      n: pairs.length,
    };
  }

  const sorted = [...pairs].sort((a, b) => a.predictor - b.predictor);
  const mid = Math.floor(sorted.length / 2);
  const lowGroup = sorted.slice(0, mid);
  const highGroup = sorted.slice(mid);

  const mean = (items: { outcome: number }[]) =>
    items.reduce((sum, item) => sum + item.outcome, 0) / items.length;

  return {
    blocked: false,
    highMean: Number(mean(highGroup).toFixed(1)),
    lowMean: Number(mean(lowGroup).toFixed(1)),
    highLabel: `After higher ${query.predictor.replace(/_/g, " ")} days`,
    lowLabel: `After lower ${query.predictor.replace(/_/g, " ")} days`,
    n: pairs.length,
  };
}
