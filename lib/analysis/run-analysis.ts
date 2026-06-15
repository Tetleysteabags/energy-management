import { analyze, buildFrame, type EngineReport } from "./analysis-engine";
import { rowsToEngineInput, type DbDailyLog, type DbWearableMetric } from "./db-frame";
import { engineReportToUi } from "./to-ui";
import type { AnalysisOutput } from "./types";

export { analyze, buildFrame };
export type { EngineReport };

export function runAnalysisFromDb(
  dailyLogs: DbDailyLog[],
  wearables: DbWearableMetric[] = [],
): AnalysisOutput {
  if (!dailyLogs.length) {
    return engineReportToUi({
      confirmatory: [],
      caseControl: [],
      crashRateBins: [],
      composites: { recoveryStrain: [], loadScore: [], strainComponents: [] },
      insights: [],
      meta: { days: 0, observedDays: 0, crashDays: 0 },
    });
  }

  const input = rowsToEngineInput(dailyLogs, wearables);
  const frame = buildFrame(input.symptoms, input.loads, input.wearables);
  const report = analyze(frame);
  return engineReportToUi(report);
}
