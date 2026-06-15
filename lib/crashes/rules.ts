import type { CrashPreviewRecord } from "@/lib/analysis/day-record";

export type CrashRule = {
  id: string;
  activeFrom: string;
  matchMode: "any" | "all";
  pemThreshold: number;
  capacityThreshold: number;
};

export function evaluateCrashDay(
  record: CrashPreviewRecord,
  rule: Pick<CrashRule, "matchMode" | "pemThreshold" | "capacityThreshold">,
): boolean {
  const pemHit = record.pem >= rule.pemThreshold;
  const capacityHit = record.capacity <= rule.capacityThreshold;

  if (rule.matchMode === "all") {
    return pemHit && capacityHit;
  }
  return pemHit || capacityHit;
}

export function previewCrashRule(
  records: CrashPreviewRecord[],
  rule: Pick<CrashRule, "matchMode" | "pemThreshold" | "capacityThreshold">,
  windowDays = 30,
): number {
  const recent = records.slice(-windowDays);
  return recent.filter((record) => evaluateCrashDay(record, rule)).length;
}
