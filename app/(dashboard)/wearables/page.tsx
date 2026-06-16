import Link from "next/link";
import { redirect } from "next/navigation";
import {
  connectWearableAction,
  disconnectWearableAction,
  syncWearableNowAction,
} from "@/app/actions/wearables";
import { WearableGlanceCard } from "@/components/dashboard/wearable-glance-card";
import { getWearableGlance } from "@/lib/wearables/queries";
import { READ_METRICS } from "@/lib/wearables/types";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function WearablesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: connections } = await supabase
    .from("wearable_connections")
    .select("*")
    .eq("user_id", user.id);

  const mock = connections?.find((row) => row.provider === "mock");
  const google = connections?.find((row) => row.provider === "google_health");

  const connected = [mock, google].find((row) => row?.status === "connected");

  if (!connected) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-medium">Wearables</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Read-only sync. Never sold or shared. Disconnect any time.
          </p>
        </div>

        <div className="border-border/60 rounded-lg border px-4 py-4">
          <p className="text-sm font-medium">What we read</p>
          <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
            {READ_METRICS.map((metric) => (
              <li key={metric}>· {metric}</li>
            ))}
          </ul>
        </div>

        <form action={connectWearableAction.bind(null, "mock")}>
          <Button type="submit" className="w-full">
            Connect mock wearable (dev)
          </Button>
        </form>

        <form action={connectWearableAction.bind(null, "google_health")}>
          <Button type="submit" variant="outline" className="w-full">
            Connect Google Health
          </Button>
        </form>

        <Link href="/import" className="text-muted-foreground block text-sm hover:underline">
          Or import a CSV instead
        </Link>
      </div>
    );
  }

  const lastSynced = connected.last_synced_at
    ? new Date(connected.last_synced_at).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "not yet";

  const glance = await getWearableGlance();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Wearables</h1>
        <p className="text-muted-foreground text-sm">
          Last synced {lastSynced}. Syncs each morning.
        </p>
      </div>

      {connected.status === "stale" ? (
        <div className="border-border/60 rounded-lg border px-4 py-3 text-sm">
          Connection looks stale — reconnect when you&apos;re ready.
        </div>
      ) : null}

      {glance ? <WearableGlanceCard glance={glance} /> : null}

      <form action={syncWearableNowAction.bind(null, connected.provider as "mock" | "google_health")}>
        <Button type="submit" className="w-full">
          Sync now
        </Button>
      </form>

      <form action={disconnectWearableAction.bind(null, connected.provider as "mock" | "google_health")}>
        <Button type="submit" variant="outline" className="w-full">
          Disconnect
        </Button>
      </form>
    </div>
  );
}
