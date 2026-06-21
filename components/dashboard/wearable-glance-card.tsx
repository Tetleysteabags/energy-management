import type { WearableGlance } from "@/lib/wearables/queries";

function formatSleep(minutes: number | null, efficiency: number | null): string {
  if (minutes == null) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const duration = mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  if (efficiency == null) return duration;
  return `${duration} · ${Math.round(efficiency * 100)}%`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

type WearableGlanceCardProps = {
  glance: WearableGlance;
  readOnly?: boolean;
};

export function WearableGlanceCard({ glance, readOnly = false }: WearableGlanceCardProps) {
  return (
    <section className="border-border/60 space-y-4 rounded-lg border bg-card px-4 py-3">
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Last night</h2>
        <div className="flex flex-wrap gap-2">
          <Stat label="Sleep" value={formatSleep(glance.sleepMinutes, glance.sleepEfficiency)} />
          <Stat
            label="Resting HR"
            value={glance.restingHr != null ? String(glance.restingHr) : "—"}
          />
          <Stat label="HRV" value={glance.hrvMs != null ? `${glance.hrvMs} ms` : "—"} />
          <Stat label="SpO₂" value={glance.spo2 != null ? `${glance.spo2}%` : "—"} />
          <Stat
            label="Resp"
            value={glance.respiratoryRate != null ? `${glance.respiratoryRate}` : "—"}
          />
        </div>
      </div>

      <div className="border-border/60 space-y-2 border-t pt-3">
        <h2 className="text-sm font-medium">Yesterday</h2>
        <div className="flex gap-2">
          <Stat
            label="Steps"
            value={glance.steps != null ? glance.steps.toLocaleString() : "—"}
          />
          <Stat
            label="Active"
            value={glance.activeMinutes != null ? `${glance.activeMinutes}m` : "—"}
          />
        </div>
      </div>

      {glance.note && !readOnly ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{glance.note}</p>
      ) : null}
    </section>
  );
}
