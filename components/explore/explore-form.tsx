"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { watchHypothesis } from "@/app/actions/settings";
import { ComparisonBars } from "@/components/analysis/analysis-sections";
import {
  EXPLORE_FIELD_GROUP_LABELS,
  EXPLORE_FIELD_OPTIONS,
  EXPLORE_SOURCES_INFO,
  exploreFieldHints,
} from "@/lib/analysis/explore-fields";
import type { ExploreQuery } from "@/lib/analysis/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ExploreResult } from "@/lib/analysis/types";

type ExploreFormProps = {
  initialResult: ExploreResult | null;
  onQuery: (query: ExploreQuery) => Promise<ExploreResult>;
};

export function ExploreForm({ initialResult, onQuery }: ExploreFormProps) {
  const [predictor, setPredictor] = useState("physical_load");
  const [outcome, setOutcome] = useState("evening_fatigue");
  const [lagDays, setLagDays] = useState<0 | 1 | 2>(1);
  const [result, setResult] = useState(initialResult);
  const [pending, startTransition] = useTransition();
  const [watchMessage, setWatchMessage] = useState<string | null>(null);

  const fieldHints = useMemo(
    () => exploreFieldHints(predictor, outcome),
    [predictor, outcome],
  );

  function runQuery() {
    startTransition(async () => {
      const next = await onQuery({ predictor, outcome, lagDays });
      setResult(next);
      setWatchMessage(null);
    });
  }

  function watchThis() {
    startTransition(async () => {
      const response = await watchHypothesis({ predictor, outcome, lagDays });
      setWatchMessage(response.error ?? "Added to the watch list for proper testing.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="border-warning/30 bg-warning/10 rounded-lg border px-4 py-3 text-sm leading-relaxed">
        Hypothesis-generating only — not evidence. Raw, uncorrected, coincidence-prone.
      </div>

      <div className="border-border/60 bg-secondary/30 rounded-lg border px-4 py-3 text-sm leading-relaxed">
        <p className="font-medium">What these numbers mean</p>
        <p className="text-muted-foreground mt-1">{EXPLORE_SOURCES_INFO}</p>
        {fieldHints.length ? (
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-4">
            {fieldHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-4">
        <FieldSelect
          id="predictor"
          label="Predictor"
          value={predictor}
          onChange={setPredictor}
        />
        <FieldSelect id="outcome" label="Outcome" value={outcome} onChange={setOutcome} />
        <div className="space-y-2">
          <Label htmlFor="timing">Timing</Label>
          <select
            id="timing"
            value={lagDays}
            onChange={(event) => setLagDays(Number(event.target.value) as 0 | 1 | 2)}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value={0}>Same day</option>
            <option value={1}>Next day</option>
            <option value={2}>Two days later</option>
          </select>
        </div>
        <Button type="button" className="w-full" onClick={runQuery} disabled={pending}>
          {pending ? "Checking…" : "See raw comparison"}
        </Button>
      </div>

      {result?.blocked ? (
        <p className="text-muted-foreground text-sm leading-relaxed">{result.blockReason}</p>
      ) : null}

      {result && !result.blocked && result.n != null && result.n > 0 ? (
        <div className="border-border/60 space-y-4 rounded-lg border px-4 py-4">
          <ComparisonBars
            highLabel={result.highLabel ?? "Higher days"}
            lowLabel={result.lowLabel ?? "Lower days"}
            highMean={result.highMean ?? 0}
            lowMean={result.lowMean ?? 0}
          />
          <p className="text-muted-foreground text-xs">
            Based on {result.n} days. Coincidence is common — not proof of cause.
          </p>
          <Button type="button" variant="outline" className="w-full" onClick={watchThis}>
            Watch this question
          </Button>
          {watchMessage ? <p className="text-muted-foreground text-xs">{watchMessage}</p> : null}
        </div>
      ) : null}

      <Link href="/analysis" className="text-muted-foreground block text-sm hover:underline">
        Back to confirmed patterns
      </Link>
    </div>
  );
}

function FieldSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const checkinOptions = EXPLORE_FIELD_OPTIONS.filter((option) => option.group === "checkin");
  const wearableOptions = EXPLORE_FIELD_OPTIONS.filter((option) => option.group === "wearable");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
      >
        <optgroup label={EXPLORE_FIELD_GROUP_LABELS.checkin}>
          {checkinOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
        <optgroup label={EXPLORE_FIELD_GROUP_LABELS.wearable}>
          {wearableOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
