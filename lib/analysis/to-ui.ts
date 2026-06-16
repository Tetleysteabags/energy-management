import type {
  ConfirmatoryResult,
  CrashRateBin,
  EngineReport,
  Insight,
} from "./analysis-engine";
import { patientCaseControlSummary, patientSummary } from "./patient-summary";
import type { AnalysisOutput, ConfidenceLabel, InsightFinding } from "./types";

function mapLabel(label: ConfirmatoryResult["label"]): ConfidenceLabel | null {
  if (label === "recurring_pattern" || label === "possible_association") {
    return label;
  }
  return null;
}

export function confirmatoryToFinding(result: ConfirmatoryResult): InsightFinding | null {
  const label = mapLabel(result.label);
  if (!label) return null;

  return {
    id: result.hypothesis.id,
    label,
    n: result.n,
    sentence: patientSummary(result.hypothesis, label),
    caveat: "A lead to watch — not proof of cause.",
    predictor: result.hypothesis.predictor,
    outcome: result.hypothesis.outcome,
    lagDays: result.hypothesis.lag,
    highLabel: `Higher ${result.hypothesis.predictor.replace(/_/g, " ")}`,
    lowLabel: `Lower ${result.hypothesis.predictor.replace(/_/g, " ")}`,
    highMean: Math.max(0, result.beta),
    lowMean: Math.max(0, -result.beta),
    effectSize: result.beta,
    ciLow: result.ci[0],
    ciHigh: result.ci[1],
    qValue: result.qBH,
  };
}

function insightToFinding(insight: Insight, report: EngineReport): InsightFinding {
  const match = report.confirmatory.find(
    (row) => row.hypothesis.label === insight.title || row.plainEnglish === insight.text,
  );

  if (match) {
    const mapped = confirmatoryToFinding(match);
    if (mapped) return mapped;
  }

  const label: ConfidenceLabel =
    insight.kind === "confirmatory" ? "recurring_pattern" : "possible_association";

  if (insight.kind === "case_control") {
    const signal =
      report.caseControl.find((row) => row.plainEnglish === insight.text)?.signal ?? insight.title;
    return {
      id: insight.title,
      label: "possible_association",
      n: report.meta.crashDays,
      sentence: patientCaseControlSummary(signal.replace(/^Crash precursor: /, "")),
      caveat: "A lead to watch — not proof of cause.",
      predictor: signal,
      outcome: "crash",
      lagDays: 1,
      highLabel: "Before crashes",
      lowLabel: "Usual days",
      highMean: 0,
      lowMean: 0,
    };
  }

  return {
    id: insight.title,
    label,
    n: match?.n ?? report.meta.observedDays,
    sentence: match
      ? patientSummary(match.hypothesis, label)
      : insight.text.replace(/\(effect [^)]+\)/g, "").replace(/95% CI[^,]+,?\s*/g, "").trim(),
    caveat: "A lead to watch — not proof of cause.",
    predictor: match?.hypothesis.predictor ?? "",
    outcome: match?.hypothesis.outcome ?? "",
    lagDays: match?.hypothesis.lag ?? 1,
    highLabel: "Higher days",
    lowLabel: "Lower days",
    highMean: match?.beta ?? 0,
    lowMean: 0,
    effectSize: match?.beta,
    ciLow: match?.ci[0],
    ciHigh: match?.ci[1],
    qValue: match?.qBH,
  };
}

function envelopeTakeaway(bins: CrashRateBin[]): string {
  if (bins.length < 2) {
    return "Collecting data on how exertion relates to crash days.";
  }
  const low = bins[0];
  const high = bins[bins.length - 1];
  if (high.crashRate > low.crashRate + 0.05) {
    return `Heavier exertion days were followed by crashes more often (${(high.crashRate * 100).toFixed(0)}% vs ${(low.crashRate * 100).toFixed(0)}%). A gentler day might help.`;
  }
  return "Crash rate has not risen clearly with heavier exertion in your data so far.";
}

export function engineReportToUi(report: EngineReport): AnalysisOutput {
  const confirmatory = report.confirmatory
    .filter((row) => row.label === "recurring_pattern")
    .map(confirmatoryToFinding)
    .filter((row): row is InsightFinding => row != null);

  const watching = report.confirmatory
    .filter((row) => row.label === "possible_association")
    .map(confirmatoryToFinding)
    .filter((row): row is InsightFinding => row != null);

  const feed = report.insights.map((insight) => insightToFinding(insight, report));

  return {
    report,
    confirmatory,
    watching,
    feed,
    envelope:
      report.crashRateBins.length > 0
        ? {
            bars: report.crashRateBins.map((bin) => ({
              loadTier:
                bin.label === "low"
                  ? "lighter"
                  : bin.label === "high"
                    ? "heavier"
                    : "moderate",
              crashRatePct: Math.round(bin.crashRate * 1000) / 10,
              n: bin.nDays,
            })),
            takeaway: envelopeTakeaway(report.crashRateBins),
          }
        : null,
    composites: {
      recoveryStrain: report.composites.recoveryStrain.at(-1) ?? null,
      loadScore: report.composites.loadScore.at(-1) ?? null,
    },
    insufficientData: report.meta.observedDays < 20,
    meta: report.meta,
  };
}
