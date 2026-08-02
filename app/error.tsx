"use client";

import Link from "next/link";
import { ErrorReporter } from "@/components/errors/error-reporter";
import { Button } from "@/components/ui/button";

/**
 * Tone here matters more than usual: the people using this app are often short
 * on energy and reading through brain fog. Short sentences, no blame, no stack
 * trace, and a way out that isn't "try to work out what went wrong".
 */
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center justify-center px-4 py-12">
      <ErrorReporter digest={error.digest} />
      <div className="border-border/60 bg-card w-full max-w-sm space-y-4 rounded-lg border px-5 py-6">
        <div className="space-y-2">
          <h1 className="text-lg font-medium">That didn&apos;t load</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Something went wrong at our end, not yours. Nothing you&apos;ve logged has been lost.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            It&apos;s already been reported — no need to do anything.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="button" className="min-h-11 w-full" onClick={() => unstable_retry()}>
            Try again
          </Button>
          <Link href="/" className="block">
            <Button type="button" variant="outline" className="min-h-11 w-full font-normal">
              Back to today
            </Button>
          </Link>
        </div>

        {error.digest ? (
          <p className="text-muted-foreground text-center text-xs">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
