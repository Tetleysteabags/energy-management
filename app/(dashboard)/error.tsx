"use client";

import Link from "next/link";
import { ErrorReporter } from "@/components/errors/error-reporter";
import { Button } from "@/components/ui/button";

/**
 * Renders inside the dashboard layout, so the nav survives and one broken
 * section doesn't take the whole app with it.
 */
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="space-y-4">
      <ErrorReporter digest={error.digest} />
      <div className="border-border/60 space-y-4 rounded-lg border px-4 py-5">
        <div className="space-y-2">
          <h1 className="text-lg font-medium">This section didn&apos;t load</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Something went wrong at our end. Your check-ins are safe — this is just the page
            failing to draw.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            It&apos;s been reported already. The rest of the app should still work.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="min-h-11 flex-1"
            onClick={() => unstable_retry()}
          >
            Try again
          </Button>
          <Link href="/" className="flex-1">
            <Button type="button" variant="outline" className="min-h-11 w-full font-normal">
              Back to today
            </Button>
          </Link>
        </div>

        {error.digest ? (
          <p className="text-muted-foreground text-xs">Reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
