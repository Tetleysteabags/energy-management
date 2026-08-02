"use client";

import { useEffect, useRef } from "react";
import { reportClientError } from "@/app/actions/report-error";

/**
 * Records a caught error, once. Renders nothing.
 *
 * Only the digest is sent. Server errors reach the browser as a generic message
 * plus that identifier, so the digest is what ties this back to the real stack
 * in the server log — and nothing from the page can leak into the report.
 */
export function ErrorReporter({ digest }: { digest?: string }) {
  const reported = useRef(false);

  useEffect(() => {
    // Effects run twice in development; the crash only happened once.
    if (reported.current) return;
    reported.current = true;
    void reportClientError(digest);
  }, [digest]);

  return null;
}
