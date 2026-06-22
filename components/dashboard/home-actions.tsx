"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitEveningCheckIn, submitMorningCheckIn } from "@/app/actions/check-in";
import { SameAsYesterdayButton } from "@/components/check-in/same-as-yesterday-button";
import type { HomeState } from "@/lib/check-in/queries";
import { logDateQueryParam } from "@/lib/check-in/log-date";
import { Button } from "@/components/ui/button";

type HomeActionsProps = {
  state: HomeState;
};

function EditCheckInLinks({ state }: { state: HomeState }) {
  const dateQuery = logDateQueryParam(state.logDate);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Link href={`/check-in/morning${dateQuery}`} className="block">
        <Button type="button" variant="outline" className="min-h-11 w-full">
          {state.morningDone ? "Edit morning check-in" : "Add morning check-in"}
        </Button>
      </Link>
      <Link href={`/check-in/evening${dateQuery}`} className="block">
        <Button type="button" variant="outline" className="min-h-11 w-full">
          {state.eveningDone ? "Edit evening check-in" : "Add evening check-in"}
        </Button>
      </Link>
    </div>
  );
}

export function HomeActions({ state }: HomeActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loggedMessage, setLoggedMessage] = useState<string | null>(null);

  const dateQuery = logDateQueryParam(state.logDate);
  const loggedLabel = state.viewingToday ? "Logged for today" : "Saved for this day";

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
          setLoggedMessage(loggedLabel);
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
          setLoggedMessage(loggedLabel);
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

  if (!state.viewingToday) {
    return (
      <section className="space-y-3">
        <p className="text-muted-foreground text-sm">Check-ins for this day</p>
        <EditCheckInLinks state={state} />
      </section>
    );
  }

  if (state.due === "done") {
    return (
      <section className="space-y-4">
        <div className="border-border/60 rounded-lg border bg-card px-4 py-4">
          <p className="text-sm font-medium">All logged today</p>
          <p className="text-muted-foreground mt-1 text-sm">Nothing else needed right now.</p>
        </div>
        <EditCheckInLinks state={state} />
      </section>
    );
  }

  const href =
    state.due === "morning"
      ? `/check-in/morning${dateQuery}`
      : `/check-in/evening${dateQuery}`;
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

      {state.morningDone || state.eveningDone ? (
        <EditCheckInLinks state={state} />
      ) : null}
    </div>
  );
}
