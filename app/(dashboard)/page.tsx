import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DayFactorsCard } from "@/components/dashboard/day-factors-card";
import { Greeting } from "@/components/dashboard/greeting";
import { HomeActions } from "@/components/dashboard/home-actions";
import { LogDatePicker } from "@/components/dashboard/log-date-picker";
import { PacingCard } from "@/components/dashboard/pacing-card";
import { SupplementsCard } from "@/components/dashboard/supplements-card";
import { TodayEventsCard } from "@/components/dashboard/today-events-card";
import { WearableGlanceCard } from "@/components/dashboard/wearable-glance-card";
import { InsightCard } from "@/components/insights/insight-card";
import { buildPacingNote } from "@/lib/analysis/pacing";
import { getAnalysisOutput } from "@/lib/analysis/queries";
import { formatLogDateLabel, parseLogDateParam } from "@/lib/check-in/log-date";
import { getHomeState } from "@/lib/check-in/queries";
import { getEventsForDate } from "@/lib/events/queries";
import { DEFAULT_EVENT_DURATION, type EventRow } from "@/lib/events/types";
import { getSupplementIntakeForDate } from "@/lib/supplements/queries";
import { getWearableGlance } from "@/lib/wearables/queries";

function loadMinutes(events: EventRow[], type: string): number {
  return events
    .filter((event) => event.event_type === type)
    .reduce(
      (total, event) => total + (event.duration_minutes ?? DEFAULT_EVENT_DURATION[type] ?? 0),
      0,
    );
}

function checkInStatus(
  due: "morning" | "evening" | "done",
  viewingToday: boolean,
): string {
  if (due === "done") {
    return viewingToday ? "All logged today" : "All logged for this day";
  }
  if (!viewingToday) {
    if (due === "morning") return "Morning check-in not logged";
    return "Evening check-in not logged";
  }
  if (due === "morning") return "Morning check-in";
  return "Evening check-in";
}

type HomePageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const logDate = parseLogDateParam(params.date);
  const state = await getHomeState(logDate);

  if (!state) {
    redirect("/login");
  }

  const [analysis, wearableGlance, dayEvents, supplementIntake] = await Promise.all([
    state.viewingToday ? getAnalysisOutput() : Promise.resolve(null),
    getWearableGlance(state.logDate),
    getEventsForDate(state.logDate),
    getSupplementIntakeForDate(state.logDate),
  ]);

  const insights = analysis?.feed.slice(0, 2) ?? [];
  const events = dayEvents ?? [];

  const pacingNote = state.viewingToday
    ? buildPacingNote({
        confirmed: analysis?.confirmatory ?? [],
        today: {
          meetingMinutes: loadMinutes(events, "meeting"),
          activeMinutes: loadMinutes(events, "walk") + loadMinutes(events, "workout"),
        },
        recoveryStrain: analysis?.composites.recoveryStrain ?? null,
        fallbackLowCapacity:
          state.yesterdayEvening?.capacity != null && state.yesterdayEvening.capacity <= 4,
      })
    : null;

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <LogDatePicker logDate={state.logDate} />
      </Suspense>

      <section className="space-y-1">
        {state.viewingToday ? <Greeting initial={state.greeting} /> : null}
        <p className="text-muted-foreground text-sm">{formatLogDateLabel(state.logDate)}</p>
        <p className="text-muted-foreground text-sm">{checkInStatus(state.due, state.viewingToday)}</p>
      </section>

      {wearableGlance ? (
        <WearableGlanceCard glance={wearableGlance} readOnly={!state.viewingToday} />
      ) : null}

      {state.viewingToday ? <PacingCard note={pacingNote} dateKey={state.logDate} /> : null}

      <TodayEventsCard
        events={events}
        logDate={state.logDate}
        viewingToday={state.viewingToday}
      />

      <DayFactorsCard
        logDate={state.logDate}
        factors={state.todayFactors}
        trackCycle={state.trackCycle}
        viewingToday={state.viewingToday}
      />

      <SupplementsCard logDate={state.logDate} intake={supplementIntake ?? []} />

      <HomeActions state={state} />

      {state.viewingToday && insights.length ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">What we&apos;re watching</h2>
            <Link href="/analysis" className="text-muted-foreground text-xs hover:underline">
              All patterns
            </Link>
          </div>
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} compact />
          ))}
        </section>
      ) : null}

      {state.viewingToday && state.baselineDaysRemaining > 0 ? (
        <div className="border-border/60 rounded-lg border bg-secondary/40 px-4 py-4">
          <p className="text-sm font-medium">Building your baseline</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {state.baselineDaysRemaining} more{" "}
            {state.baselineDaysRemaining === 1 ? "day" : "days"} — collecting data is
            progress, not a test to pass.
          </p>
        </div>
      ) : null}
    </div>
  );
}
