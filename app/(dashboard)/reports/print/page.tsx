import { redirect } from "next/navigation";
import { getAnalysisOutput } from "@/lib/analysis/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPrintPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const output = await getAnalysisOutput();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-medium">Recovery pattern summary</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Generated {new Date().toLocaleDateString()} · personal tracking data
        </p>
      </header>
      {output?.confirmatory.map((finding) => (
        <section key={finding.id} className="space-y-2">
          <p className="text-sm leading-relaxed">{finding.sentence}</p>
          <p className="text-muted-foreground text-xs">
            n={finding.n}; effect={finding.effectSize?.toFixed(2) ?? "—"}; 95% CI [
            {finding.ciLow?.toFixed(2) ?? "—"}, {finding.ciHigh?.toFixed(2) ?? "—"}]
          </p>
        </section>
      ))}
      {!output?.confirmatory.length ? (
        <p className="text-sm">Insufficient data for confirmed patterns.</p>
      ) : null}
    </div>
  );
}
