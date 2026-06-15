import { redirect } from "next/navigation";
import { CapacityHeatmap } from "@/components/trends/capacity-heatmap";
import { TrendLineCharts } from "@/components/trends/trend-line-charts";
import { getTrendData } from "@/lib/trends/queries";

export default async function TrendsPage() {
  const data = await getTrendData();

  if (!data) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">How you&apos;ve been</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{data.summary}</p>
      </div>

      <CapacityHeatmap days={data.days} />

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Single metrics</h2>
        <TrendLineCharts days={data.days} />
      </section>
    </div>
  );
}
