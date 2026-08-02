import { createClient as createSupabaseClient } from "@supabase/supabase-js";
// Request-scoped (cookie-backed) client, used when there is a session to attribute to.
import { createClient } from "@/lib/supabase/server";
import {
  describeError,
  MAX_USER_AGENT_LENGTH,
  scrub,
  scrubRoute,
} from "@/lib/observability/scrub";

export type ErrorSource = "server" | "client";

type ErrorRow = {
  user_id: string | null;
  source: ErrorSource;
  digest: string | null;
  message: string;
  route: string | null;
  user_agent: string | null;
  release: string | null;
};

export type ErrorReport = {
  error: unknown;
  source?: ErrorSource;
  /** Next.js error digest, so a user-facing reference ties back to the server log. */
  digest?: string | null;
  route?: string | null;
  userAgent?: string | null;
};

/** Set by Vercel; lets you tell which deploy a crash came from. */
function release(): string | null {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null;
}

function buildRow(report: ErrorReport, userId: string | null): ErrorRow {
  return {
    user_id: userId,
    source: report.source ?? "server",
    digest: report.digest ?? null,
    message: scrub(describeError(report.error)),
    route: scrubRoute(report.route),
    user_agent: report.userAgent ? scrub(report.userAgent, MAX_USER_AGENT_LENGTH) : null,
    release: release(),
  };
}

/** Structured so a log drain can filter on it, and so it survives the database being down. */
function logRow(row: ErrorRow): void {
  console.error(
    JSON.stringify({
      level: "error",
      event: "app_error",
      source: row.source,
      digest: row.digest,
      route: row.route,
      release: row.release,
      message: row.message,
    }),
  );
}

function logReportingFailure(error: unknown): void {
  // The original error was already logged, so this only needs to explain why
  // the durable copy is missing.
  console.error(
    JSON.stringify({
      level: "error",
      event: "app_error_report_failed",
      message: scrub(describeError(error)),
    }),
  );
}

/**
 * Records a failure so it does not depend on a user thinking to mention it.
 *
 * Writes twice on purpose: a structured line to stdout, and a row in
 * `error_reports` that is queryable and outlives log retention.
 *
 * Never throws. A reporter that can fail is worse than no reporter, because it
 * turns one broken page into two.
 */
export async function reportError(report: ErrorReport): Promise<void> {
  let row = buildRow(report, null);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    row = buildRow(report, user?.id ?? null);
    logRow(row);

    await supabase.from("error_reports").insert(row);
  } catch (reportingFailure) {
    logRow(row);
    logReportingFailure(reportingFailure);
  }
}

/**
 * Same, for callers with no request scope — chiefly `onRequestError` in
 * instrumentation.ts, which runs outside the cookie context.
 *
 * Rows land unattributed (`user_id` null), which the RLS insert policy allows.
 * Route and digest are the parts worth having here anyway.
 */
export async function reportUnattributedError(report: ErrorReport): Promise<void> {
  const row = buildRow(report, null);
  logRow(row);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  try {
    const supabase = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await supabase.from("error_reports").insert(row);
  } catch (reportingFailure) {
    logReportingFailure(reportingFailure);
  }
}
