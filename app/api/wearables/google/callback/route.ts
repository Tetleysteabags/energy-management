import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { exchangeGoogleHealthCode } from "@/lib/wearables/google-health/oauth";
import { encryptTokenPayload } from "@/lib/wearables/token-crypto";
import { syncGoogleHealthGlance } from "@/lib/wearables/google-health/sync";
import { yesterdayLogDate } from "@/lib/check-in/queries";
import { wearableSnapshotToDbRow } from "@/lib/wearables/types";

const STATE_COOKIE = "gh_oauth_state";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");
  const storedState = request.cookies.get(STATE_COOKIE)?.value;

  const failure = (reason: string) =>
    NextResponse.redirect(new URL(`/wearables?error=${encodeURIComponent(reason)}`, origin));

  if (oauthError) {
    return failure("google_denied");
  }

  if (!code || !state || !storedState || state !== storedState) {
    return failure("google_state_mismatch");
  }

  const successRedirect = NextResponse.redirect(new URL("/wearables?connected=1", origin));
  successRedirect.cookies.delete(STATE_COOKIE);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            successRedirect.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  try {
    const tokens = await exchangeGoogleHealthCode(code, origin);

    const { error } = await supabase.from("wearable_connections").upsert(
      {
        user_id: user.id,
        provider: "google_health",
        status: "connected",
        token_encrypted: encryptTokenPayload(tokens),
        last_synced_at: null,
        metadata: { connected_at: new Date().toISOString(), via: "google_oauth" },
      },
      { onConflict: "user_id,provider" },
    );

    if (error) {
      return failure("save_failed");
    }

    const logDate = new Date().toISOString().slice(0, 10);
    const yesterday = yesterdayLogDate(logDate);
    const sync = await syncGoogleHealthGlance(supabase, user.id, logDate, yesterday);

    if (!sync.error) {
      await supabase
        .from("wearable_daily_metrics")
        .upsert(
          wearableSnapshotToDbRow(user.id, logDate, "google_health", sync.today.metrics),
          { onConflict: "user_id,log_date,source" },
        );

      await supabase
        .from("wearable_daily_metrics")
        .upsert(
          wearableSnapshotToDbRow(user.id, yesterday, "google_health", sync.yesterday.metrics),
          { onConflict: "user_id,log_date,source" },
        );

      await supabase
        .from("wearable_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("provider", "google_health");
    }

    return successRedirect;
  } catch {
    return failure("google_token_exchange");
  }
}
