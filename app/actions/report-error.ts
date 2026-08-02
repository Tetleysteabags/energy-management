"use server";

import { headers } from "next/headers";
import { reportError } from "@/lib/observability/report-error";

/**
 * Lets a client error boundary record a crash.
 *
 * Takes only a digest and a route — never a message or a stack from the
 * browser. The digest is Next's own identifier for the error, so the real
 * detail is already in the server log this ties back to, and nothing a hostile
 * caller types can end up in the diagnostics table.
 */
export async function reportClientError(digest?: string): Promise<void> {
  const requestHeaders = await headers();

  await reportError({
    error: digest
      ? `Client error boundary caught digest ${digest}`
      : "Client error boundary caught an error with no digest",
    source: "client",
    digest: digest ?? null,
    route: requestHeaders.get("referer"),
    userAgent: requestHeaders.get("user-agent"),
  });
}
