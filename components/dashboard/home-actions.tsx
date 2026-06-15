"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitEveningCheckIn, submitMorningCheckIn } from "@/app/actions/check-in";
import { SameAsYesterdayButton } from "@/components/check-in/same-as-yesterday-button";
import type { HomeState } from "@/lib/check-in/queries";
import { Button } from "@/components/ui/button";

type HomeActionsProps = {
  state: HomeState;
};

export function HomeActions({ state }: HomeActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loggedMessage, setLoggedMessage] = useState<string | null>(null);

  const canSameAsYesterday =
    state.due === "morning"
      ? Boolean(state.yesterdayMorning)
      : state.due === "evening"
        ? Boolean(state.yesterdayEvening)
        : false;

  function handleSameAsYesterday() {
    startTransition(async () => {
      if (state.due === "morning" && state.yesterdayMorning) {
        const result = await submitMorningCheckIn({
          logDate: state.logDate,
          values: state.yesterdayMorning,
        });
        if (!result.error) {
          setLoggedMessage("Logged for today");
          router.refresh();
        }
        return;
      }

      if (state.due === "evening" && state.yesterdayEvening) {
        const result = await submitEveningCheckIn({
          logDate: state.logDate,
          values: { ...state.yesterdayEvening, notes: "" },
        });
        if (!result.error) {
          setLoggedMessage("Logged for today");
          router.refresh();
        }
      }
    });
  }

  if (loggedMessage) {
    return (
      <div className="border-border/60 rounded-lg border bg-card px-4 py-6 text-center">
        <p className="text-sm font-medium">{loggedMessage}</p>
      </div>
    );
  }

  if (state.due === "done") {
    return (
      <div className="border-border/60 rounded-lg border bg-card px-4 py-6">
        <p className="text-sm font-medium">All logged today</p>
        <p className="text-muted-foreground mt-1 text-sm">Nothing else needed right now.</p>
      </div>
    );
  }

  const href = state.due === "morning" ? "/check-in/morning" : "/check-in/evening";
  const label =
    state.due === "morning" ? "Morning check-in (~20s)" : "Evening check-in (~20s)";

  return (
    <div className="space-y-3">
      <Link href={href} className="block">
        <Button className="min-h-11 w-full" size="lg">
          {label}
        </Button>
      </Link>

      {canSameAsYesterday ? (
        <SameAsYesterdayButton onClick={handleSameAsYesterday} disabled={pending} />
      ) : null}
    </div>
  );
}
