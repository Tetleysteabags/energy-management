import Link from "next/link";
import { redirect } from "next/navigation";
import {
  EnvelopeSection,
  FindingDetail,
} from "@/components/analysis/analysis-sections";
import { InsightCard } from "@/components/insights/insight-card";
import { getAnalysisOutput } from "@/lib/analysis/queries";
import { BASELINE_TARGET_DAYS } from "@/lib/check-in/scales";
import { createClient } from "@/lib/supabase/server";

export default async function AnalysisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const output = await getAnalysisOutput();
  const { count } = await supabase
    .from("daily_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const daysRemaining = Math.max(0, BASELINE_TARGET_DAYS - (count ?? 0));

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Your patterns</h1>
        <p className="text-muted-foreground text-sm">
          Confirmed findings only — plain language, with uncertainty shown.
        </p>
      </div>

      {daysRemaining > 0 ? (
        <div className="border-border/60 rounded-lg border bg-secondary/40 px-4 py-4 text-sm">
          Building your baseline — {daysRemaining} more {daysRemaining === 1 ? "day" : "days"}.
        </div>
      ) : null}

      {output?.envelope ? (
        <EnvelopeSection bars={output.envelope.bars} takeaway={output.envelope.takeaway} />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Recurring patterns</h2>
        {output?.confirmatory.length ? (
          output.confirmatory.map((finding) => (
            <details key={finding.id} className="border-border/60 rounded-lg border px-4 py-3">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <InsightCard insight={finding} compact />
              </summary>
              <div className="mt-4 border-t border-border/60 pt-4">
                <FindingDetail finding={finding} />
              </div>
            </details>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">No reliable associations yet.</p>
        )}
      </section>

      {output?.watching.length ? (
        <section className="space-y-3 opacity-90">
          <h2 className="text-muted-foreground text-sm font-medium">Still watching</h2>
          {output.watching.map((finding) => (
            <InsightCard key={finding.id} insight={finding} compact />
          ))}
        </section>
      ) : null}

      <Link href="/explore" className="text-muted-foreground block text-sm hover:underline">
        Explore raw questions (not evidence) →
      </Link>
    </div>
  );
}
