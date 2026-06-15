import { cn } from "@/lib/utils";
import type { ConfidenceLabel } from "@/lib/analysis/analysis-engine";
import type { InsightFinding } from "@/lib/analysis/types";

const LABELS: Record<ConfidenceLabel, string> = {
  recurring_pattern: "Recurring pattern",
  possible_association: "Possible",
  insufficient_data: "Collecting data",
  no_signal: "No signal",
};

const PILL_STYLES: Record<ConfidenceLabel, string> = {
  recurring_pattern: "bg-info/15 text-info-foreground",
  possible_association: "bg-warning/15 text-warning-foreground",
  insufficient_data: "bg-secondary text-muted-foreground",
  no_signal: "bg-secondary text-muted-foreground",
};

type InsightCardProps = {
  insight: InsightFinding;
  compact?: boolean;
};

export function InsightCard({ insight, compact }: InsightCardProps) {
  return (
    <article
      className={cn(
        "border-border/60 rounded-lg border bg-card px-4 py-3",
        compact && "py-2.5",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            PILL_STYLES[insight.label],
          )}
        >
          {LABELS[insight.label]}
        </span>
        <span className="text-muted-foreground text-xs">{insight.n} days</span>
      </div>
      <p className="text-sm leading-relaxed">{insight.sentence}</p>
      <p className="text-muted-foreground mt-2 text-xs">
        {insight.caveat || "A lead to watch — not proof of cause."}
      </p>
    </article>
  );
}

export function ConfidencePill({ label }: { label: ConfidenceLabel }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        PILL_STYLES[label],
      )}
    >
      {LABELS[label]}
    </span>
  );
}
