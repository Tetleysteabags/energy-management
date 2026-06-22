"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { submitMorningCheckIn } from "@/app/actions/check-in";
import { LoadSegmentField } from "@/components/check-in/load-segment-field";
import { SameAsYesterdayButton } from "@/components/check-in/same-as-yesterday-button";
import { SliderField } from "@/components/check-in/slider-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capacityWord, chestWord, muscleWord, sleepWord, symptomWord } from "@/lib/check-in/scales";
import { formatLogDateLabel, homePathForLogDate, isToday } from "@/lib/check-in/log-date";
import type { MorningCheckInValues } from "@/lib/check-in/types";

type MorningCheckInFormProps = {
  logDate: string;
  initialValues: MorningCheckInValues;
  yesterdayValues: MorningCheckInValues | null;
  hintValues: MorningCheckInValues | null;
  alreadySubmitted: boolean;
};

export function MorningCheckInForm({
  logDate,
  initialValues,
  yesterdayValues,
  hintValues,
  alreadySubmitted,
}: MorningCheckInFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [, startUiTransition] = useTransition();
  const [values, setValues] = useState<MorningCheckInValues>(initialValues);
  const [showMore, setShowMore] = useState(false);
  const [logged, setLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(partial: Partial<MorningCheckInValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  function submit(nextValues: MorningCheckInValues) {
    setError(null);
    startTransition(async () => {
      const result = await submitMorningCheckIn({ logDate, values: nextValues });
      if (result.error) {
        setError(result.error);
        return;
      }
      setLogged(true);
      router.refresh();
    });
  }

  function handleSameAsYesterday() {
    if (!yesterdayValues) return;
    setValues(yesterdayValues);
    submit(yesterdayValues);
  }

  if (logged) {
    return (
      <div className="border-border/60 rounded-lg border bg-card px-4 py-8 text-center">
        <p className="text-sm font-medium">
          {isToday(logDate) ? "Logged for today" : "Saved for this day"}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">Morning check-in saved.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push(homePathForLogDate(logDate))}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Morning check-in</h1>
        {!isToday(logDate) ? (
          <p className="text-muted-foreground text-sm">{formatLogDateLabel(logDate)}</p>
        ) : null}
        <p className="text-muted-foreground text-sm">Change only what&apos;s different.</p>
      </div>

      {yesterdayValues ? (
        <SameAsYesterdayButton onClick={handleSameAsYesterday} disabled={pending} />
      ) : null}

      <div className="space-y-6">
        <SliderField
          id="sleep-quality"
          label="Sleep quality"
          value={values.sleepQuality}
          onChange={(sleepQuality) => patch({ sleepQuality })}
          wordLabel={sleepWord(values.sleepQuality)}
          yesterdayValue={hintValues?.sleepQuality}
        />
        <SliderField
          id="rested-score"
          label="Rested on waking"
          value={values.restedScore}
          onChange={(restedScore) => patch({ restedScore })}
          wordLabel={symptomWord(values.restedScore)}
          yesterdayValue={hintValues?.restedScore}
        />
        <SliderField
          id="morning-fatigue"
          label="Fatigue"
          value={values.morningFatigue}
          onChange={(morningFatigue) => patch({ morningFatigue })}
          wordLabel={symptomWord(values.morningFatigue)}
          yesterdayValue={hintValues?.morningFatigue}
        />
        <SliderField
          id="morning-brain-fog"
          label="Brain fog"
          value={values.morningBrainFog}
          onChange={(morningBrainFog) => patch({ morningBrainFog })}
          wordLabel={symptomWord(values.morningBrainFog)}
          yesterdayValue={hintValues?.morningBrainFog}
        />

        {showMore ? (
          <div className="border-border/60 space-y-6 border-t pt-6">
            <SliderField
              id="morning-chest-feeling"
              label="Chest feeling"
              value={values.morningChestFeeling}
              onChange={(morningChestFeeling) => patch({ morningChestFeeling })}
              wordLabel={chestWord(values.morningChestFeeling)}
              yesterdayValue={hintValues?.morningChestFeeling}
            />
            <SliderField
              id="morning-muscle-level"
              label="Muscle level"
              value={values.morningMuscleLevel}
              onChange={(morningMuscleLevel) => patch({ morningMuscleLevel })}
              wordLabel={muscleWord(values.morningMuscleLevel)}
              yesterdayValue={hintValues?.morningMuscleLevel}
            />
            <div className="space-y-2">
              <Label htmlFor="sleep-hours">Hours slept (optional)</Label>
              <Input
                id="sleep-hours"
                type="number"
                inputMode="decimal"
                min={0}
                max={24}
                step={0.5}
                placeholder="e.g. 7.5"
                value={values.sleepHours ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  patch({ sleepHours: raw === "" ? null : Number.parseFloat(raw) });
                }}
              />
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground h-auto w-full gap-1 py-2 text-sm font-normal"
            onClick={() => startUiTransition(() => setShowMore(true))}
          >
            Show more
            <ChevronDown className="size-4" />
          </Button>
        )}
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {alreadySubmitted ? (
        <p className="text-muted-foreground text-xs">
          {isToday(logDate)
            ? "Updating today's morning entry."
            : `Updating morning entry for ${formatLogDateLabel(logDate)}.`}
        </p>
      ) : null}

      <Button
        type="button"
        className="min-h-11 w-full"
        size="lg"
        onClick={() => submit(values)}
        disabled={pending}
      >
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
