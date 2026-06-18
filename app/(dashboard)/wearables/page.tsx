import Link from "next/link";
import { redirect } from "next/navigation";
import {
  connectMockWearableAction,
  disconnectWearableAction,
  syncWearableNowAction,
} from "@/app/actions/wearables";
import { WearableGlanceCard } from "@/components/dashboard/wearable-glance-card";
import { getWearableGlance } from "@/lib/wearables/queries";
import { isGoogleHealthConfigured } from "@/lib/wearables/google-health/config";
import { READ_METRICS } from "@/lib/wearables/types";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    "Google Health OAuth is not configured on the server yet. Add GOOGLE_HEALTH_CLIENT_ID and GOOGLE_HEALTH_CLIENT_SECRET in Vercel.",
  google_denied: "Google access was not approved. Nothing was connected.",
  google_state_mismatch: "That connect attempt expired. Please try again.",
  google_token_exchange: "Google sign-in did not complete. Try Connect again.",
  save_failed: "Connected to Google but saving the link failed. Try again.",
};

type WearablesPageProps = {
  searchParams: Promise<{ error?: string; connected?: string; synced?: string; sync_error?: string }>;
};

export default async function WearablesPage({ searchParams }: WearablesPageProps) {
  const params = await searchParams;
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

  const connected = [mock, google].find(
    (row) => row?.status === "connected" && row.token_encrypted !== "pending_oauth",
  );

  const showDevMock = process.env.NODE_ENV === "development";
  const googleConfigured = isGoogleHealthConfigured();
  const banner = params.error ? ERROR_MESSAGES[params.error] : params.sync_error ?? null;
  const justConnected = params.connected === "1";
  const justSynced = params.synced === "1";

  if (!connected) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-medium">Wearables</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Read-only sync from Fitbit or Pixel Watch via Google. Never sold or shared. Disconnect
            any time.
          </p>
        </div>

        {banner ? (
          <div className="border-border/60 rounded-lg border px-4 py-3 text-sm">{banner}</div>
        ) : null}

        <div className="border-border/60 rounded-lg border px-4 py-4">
          <p className="text-sm font-medium">What we read</p>
          <ul className="text-muted-foreground mt-2 space-y-1 text-sm">
            {READ_METRICS.map((metric) => (
              <li key={metric}>· {metric}</li>
            ))}
          </ul>
        </div>

        {googleConfigured ? (
          <Link
            href="/api/wearables/google/connect"
            className={cn(buttonVariants(), "min-h-11 w-full")}
          >
            Connect Fitbit / Google Health
          </Link>
        ) : (
          <div className="border-border/60 rounded-lg border px-4 py-3 text-sm">
            <p className="font-medium">Connect not available yet</p>
            <p className="text-muted-foreground mt-1">
              The server needs Google Health API credentials. See docs/supabase-setup.md.
            </p>
          </div>
        )}

        {showDevMock ? (
          <form action={connectMockWearableAction}>
            <Button type="submit" variant="outline" className="w-full">
              Connect mock wearable (dev)
            </Button>
          </form>
        ) : null}

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
  const isGoogle = connected.provider === "google_health";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Wearables</h1>
        <p className="text-muted-foreground text-sm">
          {isGoogle ? "Fitbit / Google Health" : "Mock wearable"} · Last synced {lastSynced}. Syncs
          each morning.
        </p>
      </div>

      {justConnected ? (
        <div className="border-border/60 rounded-lg border px-4 py-3 text-sm">
          Connected. If numbers are blank, your watch may need another sync after data appears in
          Google Health.
        </div>
      ) : null}

      {justSynced ? (
        <div className="border-border/60 rounded-lg border px-4 py-3 text-sm">
          Sync complete. If numbers are still blank, open the Fitbit app so your watch can sync to
          Google Health first.
        </div>
      ) : null}

      {banner ? (
        <div className="border-border/60 rounded-lg border px-4 py-3 text-sm">{banner}</div>
      ) : null}

      {connected.status === "stale" ? (
        <div className="border-border/60 space-y-3 rounded-lg border px-4 py-3 text-sm">
          <p>Connection looks stale — reconnect when you&apos;re ready.</p>
          {isGoogle ? (
            <Link
              href="/api/wearables/google/connect"
              className={cn(buttonVariants({ variant: "outline" }), "w-full font-normal")}
            >
              Reconnect Google Health
            </Link>
          ) : null}
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
