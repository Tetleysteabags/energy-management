import type { Instrumentation } from "next";
import { reportUnattributedError } from "@/lib/observability/report-error";

/**
 * Catches every server-side failure — Server Component renders, route handlers,
 * server actions and middleware alike.
 *
 * This is the reliable half of the crash log. The `error.tsx` boundaries report
 * too, but only once the browser hydrates and runs their effect: when a Server
 * Component throws, Next streams a shell and the boundary renders on the
 * client, so a request without JavaScript would otherwise leave no trace.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : null;

  const userAgent = request.headers["user-agent"];

  await reportUnattributedError({
    error,
    source: "server",
    digest,
    // routePath is the route file (/settings/[id]); path is what was requested.
    route: context.routePath || request.path,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
  });
};
