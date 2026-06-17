"use client";

import dynamic from "next/dynamic";
import type { TrendDay } from "@/lib/trends/queries";

const TrendLineCharts = dynamic(
  () =>
    import("@/components/trends/trend-line-charts").then((mod) => ({
      default: mod.TrendLineCharts,
    })),
  {
    ssr: false,
    loading: () => <p className="text-muted-foreground text-sm">Charts loading…</p>,
  },
);

type TrendLineChartsLazyProps = {
  days: TrendDay[];
};

export function TrendLineChartsLazy({ days }: TrendLineChartsLazyProps) {
  return <TrendLineCharts days={days} />;
}
