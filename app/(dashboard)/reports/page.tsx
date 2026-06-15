import Link from "next/link";
import { redirect } from "next/navigation";
import { getAnalysisOutput } from "@/lib/analysis/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const output = await getAnalysisOutput();
  const { data: rows } = await supabase
    .from("daily_logs")
    .select("log_date, capacity, evening_fatigue, pem, physical_load, cognitive_load")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-8 print:space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Doctor summary</h1>
        <p className="text-muted-foreground text-sm">
          For appointments — includes statistical detail not shown elsewhere.
        </p>
      </div>

      <div className="flex gap-2 print:hidden">
        <a
          href="/api/reports/export"
          className="border-input bg-background hover:bg-muted inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border px-3 text-sm"
        >
          Download CSV
        </a>
        <Link
          href="/reports/print"
          target="_blank"
          className="border-input bg-background hover:bg-muted inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border px-3 text-sm"
        >
          Printable view
        </Link>
      </div>

      <section className="border-border/60 space-y-3 rounded-lg border px-4 py-4">
        <h2 className="text-sm font-medium">Summary</h2>
        <p className="text-sm leading-relaxed">
          {rows?.length ?? 0} recent days logged. This report lists possible patterns
          from personal data — associations, not diagnoses.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Confirmed patterns</h2>
        {output?.confirmatory.length ? (
          output.confirmatory.map((finding) => (
            <div key={finding.id} className="border-border/60 rounded-lg border px-4 py-3 text-sm">
              <p>{finding.sentence}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                n={finding.n}; effect={finding.effectSize?.toFixed(2) ?? "—"}; CI [
                {finding.ciLow?.toFixed(2) ?? "—"}, {finding.ciHigh?.toFixed(2) ?? "—"}]; q=
                {finding.qValue?.toFixed(3) ?? "—"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">No confirmed patterns yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Recent daily snapshot</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Capacity</th>
                <th className="py-2 pr-3">Fatigue</th>
                <th className="py-2 pr-3">PEM</th>
                <th className="py-2">Loads</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.log_date} className="border-b border-border/40">
                  <td className="py-2 pr-3">{row.log_date}</td>
                  <td className="py-2 pr-3">{row.capacity ?? "—"}</td>
                  <td className="py-2 pr-3">{row.evening_fatigue ?? "—"}</td>
                  <td className="py-2 pr-3">{row.pem ?? "—"}</td>
                  <td className="py-2">
                    P{row.physical_load ?? "—"} C{row.cognitive_load ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
