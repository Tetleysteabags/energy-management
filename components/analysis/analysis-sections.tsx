"use client";

import type { EnvelopeBar, InsightFinding } from "@/lib/analysis/types";

export function ComparisonBars({
  highLabel,
  lowLabel,
  highMean,
  lowMean,
}: {
  highLabel: string;
  lowLabel: string;
  highMean: number;
  lowMean: number;
}) {
  const max = Math.max(highMean, lowMean, 1);

  return (
    <div className="space-y-3">
      <BarRow label={lowLabel} value={lowMean} max={max} />
      <BarRow label={highLabel} value={highMean} max={max} />
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = `${Math.round((value / max) * 100)}%`;

  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="bg-muted h-2 rounded-full">
        <div className="bg-info/60 h-2 rounded-full" style={{ width }} />
      </div>
    </div>
  );
}

export function EnvelopeSection({
  bars,
  takeaway,
}: {
  bars: EnvelopeBar[];
  takeaway: string;
}) {
  const max = Math.max(...bars.map((bar) => bar.crashRatePct), 1);

  return (
    <section className="border-border/60 space-y-4 rounded-lg border px-4 py-4">
      <div>
        <h2 className="text-sm font-medium">How much is too much</h2>
        <p className="text-muted-foreground mt-1 text-sm">{takeaway}</p>
      </div>
      <div className="space-y-3">
        {bars.map((bar) => (
          <div key={bar.loadTier} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="capitalize">{bar.loadTier} days</span>
              <span className="tabular-nums">{bar.crashRatePct}% crash rate · n={bar.n}</span>
            </div>
            <div className="bg-muted h-2 rounded-full">
              <div
                className="bg-warning/60 h-2 rounded-full"
                style={{ width: `${Math.round((bar.crashRatePct / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FindingDetail({ finding }: { finding: InsightFinding }) {
  return (
    <ComparisonBars
      highLabel={finding.highLabel}
      lowLabel={finding.lowLabel}
      highMean={finding.highMean}
      lowMean={finding.lowMean}
    />
  );
}
