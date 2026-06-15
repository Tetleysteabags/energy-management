import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { HomeActions } from "@/components/dashboard/home-actions";
import { InsightCard } from "@/components/insights/insight-card";
import { getTopInsights } from "@/lib/analysis/queries";
import { getHomeState } from "@/lib/check-in/queries";

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function HomePage() {
  const state = await getHomeState();

  if (!state) {
    redirect("/login");
  }

  const insights = await getTopInsights(2);
  const showPacingHint =
    state.yesterdayEvening?.capacity != null && state.yesterdayEvening.capacity <= 4;

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight">{state.greeting}</h1>
        <p className="text-muted-foreground text-sm">{formatDate(state.logDate)}</p>
      </section>

      {showPacingHint ? (
        <div className="border-info/30 bg-info/10 flex gap-3 rounded-lg border px-4 py-3">
          <Info className="text-info mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="text-sm leading-relaxed">
            Recovery looked lower last night — a gentler day might help.
          </p>
        </div>
      ) : null}

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
