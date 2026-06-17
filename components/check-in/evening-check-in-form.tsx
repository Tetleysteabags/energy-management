"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { submitEveningCheckIn } from "@/app/actions/check-in";
import { saveSupplementIntake } from "@/app/actions/supplements";
import { SupplementChips } from "@/components/check-in/supplement-chips";
import { LoadSegmentField } from "@/components/check-in/load-segment-field";
import { SameAsYesterdayButton } from "@/components/check-in/same-as-yesterday-button";
import { SliderField } from "@/components/check-in/slider-field";
import { ToggleChip } from "@/components/check-in/toggle-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { capacityWord, chestWord, muscleWord, symptomWord } from "@/lib/check-in/scales";
import type { EveningCheckInValues } from "@/lib/check-in/types";
import type { SupplementIntake } from "@/lib/supplements/queries";

type EveningCheckInFormProps = {
  logDate: string;
  initialValues: EveningCheckInValues;
  yesterdayValues: EveningCheckInValues | null;
  hintValues: EveningCheckInValues | null;
  alreadySubmitted: boolean;
  supplementIntake: SupplementIntake[];
};

export function EveningCheckInForm({
  logDate,
  initialValues,
  yesterdayValues,
  hintValues,
  alreadySubmitted,
  supplementIntake: initialSupplementIntake,
}: EveningCheckInFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [, startUiTransition] = useTransition();
  const [values, setValues] = useState<EveningCheckInValues>(initialValues);
  const [supplementIntake, setSupplementIntake] = useState(initialSupplementIntake);
  const [showMore, setShowMore] = useState(false);
  const [showNotes, setShowNotes] = useState(Boolean(initialValues.notes));
  const [logged, setLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(partial: Partial<EveningCheckInValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  function submit(nextValues: EveningCheckInValues) {
    setError(null);
    startTransition(async () => {
      const result = await submitEveningCheckIn({ logDate, values: nextValues });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (supplementIntake.length) {
        await saveSupplementIntake({
          logDate,
          intake: supplementIntake.map((item) => ({
            supplementId: item.supplementId,
            taken: item.taken,
          })),
        });
      }
      setLogged(true);
      router.refresh();
    });
  }

  function handleSameAsYesterday() {
    if (!yesterdayValues) return;
    const next = { ...yesterdayValues, notes: "" };
    setValues(next);
    submit(next);
  }

  if (logged) {
    return (
      <div className="border-border/60 rounded-lg border bg-card px-4 py-8 text-center">
        <p className="text-sm font-medium">Logged for today</p>
        <p className="text-muted-foreground mt-1 text-sm">Evening check-in saved.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/")}>
          Back to home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Evening check-in</h1>
        <p className="text-muted-foreground text-sm">Change only what&apos;s different.</p>
      </div>

      {yesterdayValues ? (
        <SameAsYesterdayButton onClick={handleSameAsYesterday} disabled={pending} />
      ) : null}

      <div className="space-y-6">
        <LoadSegmentField
          id="physical-load"
          label="Physical load"
          value={values.physicalLoad}
          onChange={(physicalLoad) => patch({ physicalLoad })}
          yesterdayValue={hintValues?.physicalLoad}
        />
        <LoadSegmentField
          id="cognitive-load"
          label="Cognitive load"
          value={values.cognitiveLoad}
          onChange={(cognitiveLoad) => patch({ cognitiveLoad })}
          yesterdayValue={hintValues?.cognitiveLoad}
        />
        <SliderField
          id="capacity"
          label="Capacity"
          value={values.capacity}
          onChange={(capacity) => patch({ capacity })}
          wordLabel={capacityWord(values.capacity)}
          yesterdayValue={hintValues?.capacity}
        />
        <SliderField
          id="evening-fatigue"
          label="Fatigue"
          value={values.eveningFatigue}
          onChange={(eveningFatigue) => patch({ eveningFatigue })}
          wordLabel={symptomWord(values.eveningFatigue)}
          yesterdayValue={hintValues?.eveningFatigue}
        />

        {showMore ? (
          <div className="border-border/60 space-y-6 border-t pt-6">
            <LoadSegmentField
              id="social-load"
              label="Social load"
              value={values.socialLoad}
              onChange={(socialLoad) => patch({ socialLoad })}
              yesterdayValue={hintValues?.socialLoad}
            />
            <SliderField
              id="evening-brain-fog"
              label="Brain fog"
              value={values.eveningBrainFog}
              onChange={(eveningBrainFog) => patch({ eveningBrainFog })}
              wordLabel={symptomWord(values.eveningBrainFog)}
              yesterdayValue={hintValues?.eveningBrainFog}
            />
            <SliderField
              id="evening-chest-feeling"
              label="Chest feeling"
              value={values.eveningChestFeeling}
              onChange={(eveningChestFeeling) => patch({ eveningChestFeeling })}
              wordLabel={chestWord(values.eveningChestFeeling)}
              yesterdayValue={hintValues?.eveningChestFeeling}
            />
            <SliderField
              id="evening-muscle-level"
              label="Muscle level"
              value={values.eveningMuscleLevel}
              onChange={(eveningMuscleLevel) => patch({ eveningMuscleLevel })}
              wordLabel={muscleWord(values.eveningMuscleLevel)}
              yesterdayValue={hintValues?.eveningMuscleLevel}
            />
            <SliderField
              id="pem"
              label="PEM feeling"
              value={values.pem}
              onChange={(pem) => patch({ pem })}
              wordLabel={symptomWord(values.pem)}
              yesterdayValue={hintValues?.pem}
            />

            <div className="space-y-2">
              <Label className="text-sm font-normal">Today&apos;s factors</Label>
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  label="Alcohol"
                  pressed={values.alcohol}
                  onPressedChange={(alcohol) =>
                    patch({ alcohol, alcoholUnits: alcohol ? values.alcoholUnits || 1 : 0 })
                  }
                />
                <ToggleChip
                  label="Late caffeine"
                  pressed={values.lateCaffeine}
                  onPressedChange={(lateCaffeine) => patch({ lateCaffeine })}
                />
                <ToggleChip
                  label="Late meal"
                  pressed={values.lateMeal}
                  onPressedChange={(lateMeal) => patch({ lateMeal })}
                />
              </div>
              {values.alcohol ? (
                <div className="flex items-center gap-3 pt-1">
                  <Label htmlFor="alcohol-units" className="text-muted-foreground text-xs">
                    Units
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Decrease units"
                      onClick={() =>
                        patch({ alcoholUnits: Math.max(0, values.alcoholUnits - 1) })
                      }
                    >
                      −
                    </Button>
                    <span className="min-w-6 text-center text-sm tabular-nums">
                      {values.alcoholUnits}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Increase units"
                      onClick={() =>
                        patch({ alcoholUnits: Math.min(20, values.alcoholUnits + 1) })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
              ) : null}
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

        <SupplementChips intake={supplementIntake} onChange={setSupplementIntake} />

        {showNotes ? (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-normal">
              Note
            </Label>
            <textarea
              id="notes"
              rows={3}
              maxLength={2000}
              placeholder="Anything worth noting"
              className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
              value={values.notes}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground h-auto px-0 py-1 text-sm font-normal"
            onClick={() => startUiTransition(() => setShowNotes(true))}
          >
            Add a note (optional)
          </Button>
        )}
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {alreadySubmitted ? (
        <p className="text-muted-foreground text-xs">Updating today&apos;s evening entry.</p>
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
