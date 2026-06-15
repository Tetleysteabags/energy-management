"use client";

import { useState, useTransition } from "react";
import {
  previewCrashRuleAction,
  recomputePastCrashes,
  updateCrashRule,
} from "@/app/actions/settings";
import { symptomWord } from "@/lib/check-in/scales";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type CrashRuleBuilderProps = {
  initial: {
    matchMode: "any" | "all";
    pemThreshold: number;
    capacityThreshold: number;
  };
};

export function CrashRuleBuilder({ initial }: CrashRuleBuilderProps) {
  const [matchMode, setMatchMode] = useState(initial.matchMode);
  const [pemThreshold, setPemThreshold] = useState(initial.pemThreshold);
  const [capacityThreshold, setCapacityThreshold] = useState(initial.capacityThreshold);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function preview() {
    startTransition(async () => {
      const result = await previewCrashRuleAction({
        matchMode,
        pemThreshold,
        capacityThreshold,
      });
      setPreviewCount(result.previewCount ?? null);
    });
  }

  function save() {
    startTransition(async () => {
      const result = await updateCrashRule({
        matchMode,
        pemThreshold,
        capacityThreshold,
      });
      setMessage(result.error ?? "Saved from today forward. Past days keep their prior definition.");
    });
  }

  function recompute() {
    startTransition(async () => {
      const result = await recomputePastCrashes();
      setMessage(result.error ?? "Re-checked past days with the current rule.");
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Mark a day as a crash when{" "}
        <select
          value={matchMode}
          onChange={(event) => setMatchMode(event.target.value as "any" | "all")}
          className="border-input bg-background rounded border px-1 py-0.5"
        >
          <option value="any">any</option>
          <option value="all">all</option>
        </select>{" "}
        of these are true:
      </p>

      <div className="space-y-2">
        <Label>PEM is at least {pemThreshold} ({symptomWord(pemThreshold)})</Label>
        <Slider
          min={0}
          max={10}
          step={1}
          value={[pemThreshold]}
          onValueChange={(values) => {
            const next = Array.isArray(values) ? values[0] : values;
            setPemThreshold(next ?? pemThreshold);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>Capacity is at most {capacityThreshold}</Label>
        <Slider
          min={0}
          max={10}
          step={1}
          value={[capacityThreshold]}
          onValueChange={(values) => {
            const next = Array.isArray(values) ? values[0] : values;
            setCapacityThreshold(next ?? capacityThreshold);
          }}
        />
      </div>

      <Button type="button" variant="outline" onClick={preview} disabled={pending}>
        Preview last 30 days
      </Button>

      {previewCount != null ? (
        <p className="text-muted-foreground text-sm">
          About {previewCount} of your last 30 days would count.
        </p>
      ) : null}

      <Button type="button" className="w-full" onClick={save} disabled={pending}>
        Save rule from today
      </Button>

      <Button type="button" variant="outline" className="w-full" onClick={recompute} disabled={pending}>
        Re-check past days with this rule
      </Button>

      {message ? <p className="text-muted-foreground text-xs">{message}</p> : null}
    </div>
  );
}
