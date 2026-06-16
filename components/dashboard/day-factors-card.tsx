"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDayFactors } from "@/app/actions/check-in";
import { ToggleChip } from "@/components/check-in/toggle-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type DayFactors = {
  alcohol: boolean;
  alcoholUnits: number;
  lateCaffeine: boolean;
  lateMeal: boolean;
};

type DayFactorsCardProps = {
  logDate: string;
  factors: DayFactors;
};

export function DayFactorsCard({ logDate, factors: initial }: DayFactorsCardProps) {
  const router = useRouter();
  const [factors, setFactors] = useState<DayFactors>(initial);
  const [pending, startTransition] = useTransition();

  function persist(next: DayFactors) {
    setFactors(next);
    startTransition(async () => {
      await saveDayFactors({ logDate, ...next });
      router.refresh();
    });
  }

  function setAlcohol(alcohol: boolean) {
    persist({
      ...factors,
      alcohol,
      alcoholUnits: alcohol ? factors.alcoholUnits || 1 : 0,
    });
  }

  function setUnits(alcoholUnits: number) {
    persist({ ...factors, alcoholUnits: Math.min(20, Math.max(0, alcoholUnits)) });
  }

  return (
    <section className="border-border/60 space-y-3 rounded-lg border bg-card px-4 py-3">
      <h2 className="text-sm font-medium">Today&apos;s factors</h2>

      <div className="flex flex-wrap gap-2">
        <ToggleChip
          label="Alcohol"
          pressed={factors.alcohol}
          onPressedChange={setAlcohol}
        />
        <ToggleChip
          label="Late caffeine"
          pressed={factors.lateCaffeine}
          onPressedChange={(lateCaffeine) => persist({ ...factors, lateCaffeine })}
        />
        <ToggleChip
          label="Late meal"
          pressed={factors.lateMeal}
          onPressedChange={(lateMeal) => persist({ ...factors, lateMeal })}
        />
      </div>

      {factors.alcohol ? (
        <div className="flex items-center gap-3">
          <Label htmlFor="day-alcohol-units" className="text-muted-foreground text-xs">
            Units
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Decrease units"
              disabled={pending}
              onClick={() => setUnits(factors.alcoholUnits - 1)}
            >
              −
            </Button>
            <span
              id="day-alcohol-units"
              className="min-w-6 text-center text-sm tabular-nums"
            >
              {factors.alcoholUnits}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Increase units"
              disabled={pending}
              onClick={() => setUnits(factors.alcoholUnits + 1)}
            >
              +
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
