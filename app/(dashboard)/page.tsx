import Link from "next/link";
import { redirect } from "next/navigation";
import { DayFactorsCard } from "@/components/dashboard/day-factors-card";
import { Greeting } from "@/components/dashboard/greeting";
import { HomeActions } from "@/components/dashboard/home-actions";
import { PacingCard } from "@/components/dashboard/pacing-card";
import { SupplementsCard } from "@/components/dashboard/supplements-card";
import { TodayEventsCard } from "@/components/dashboard/today-events-card";
import { WearableGlanceCard } from "@/components/dashboard/wearable-glance-card";
import { InsightCard } from "@/components/insights/insight-card";
import { buildPacingNote } from "@/lib/analysis/pacing";
import { getAnalysisOutput } from "@/lib/analysis/queries";
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

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function checkInStatus(due: "morning" | "evening" | "done"): string {
  if (due === "morning") return "Morning check-in";
  if (due === "evening") return "Evening check-in";
  return "All logged today";
}

export default async function HomePage() {
  const state = await getHomeState();

  if (!state) {
    redirect("/login");
  }

  const [analysis, wearableGlance, todayEvents, supplementIntake] = await Promise.all([
    getAnalysisOutput(),
    getWearableGlance(state.logDate),
    getEventsForDate(state.logDate),
    getSupplementIntakeForDate(state.logDate),
  ]);

  const insights = analysis?.feed.slice(0, 2) ?? [];
  const events = todayEvents ?? [];

  const pacingNote = buildPacingNote({
    confirmed: analysis?.confirmatory ?? [],
    today: {
      meetingMinutes: loadMinutes(events, "meeting"),
      activeMinutes: loadMinutes(events, "walk") + loadMinutes(events, "workout"),
    },
    recoveryStrain: analysis?.composites.recoveryStrain ?? null,
    fallbackLowCapacity:
      state.yesterdayEvening?.capacity != null && state.yesterdayEvening.capacity <= 4,
  });

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <Greeting initial={state.greeting} />
        <p className="text-muted-foreground text-sm">{formatDate(state.logDate)}</p>
        <p className="text-muted-foreground text-sm">{checkInStatus(state.due)}</p>
      </section>

      {wearableGlance ? <WearableGlanceCard glance={wearableGlance} /> : null}

      <PacingCard note={pacingNote} dateKey={state.logDate} />

      <TodayEventsCard events={events} />

      <DayFactorsCard
        logDate={state.logDate}
        factors={state.todayFactors}
        trackCycle={state.trackCycle}
      />

      <SupplementsCard logDate={state.logDate} intake={supplementIntake ?? []} />

      <HomeActions state={state} />

      {insights.length ? (
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

      {state.baselineDaysRemaining > 0 ? (
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
