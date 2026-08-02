"use client";

import { ErrorReporter } from "@/components/errors/error-reporter";

/**
 * Last line of defence — replaces the root layout, so it renders its own
 * document and cannot rely on the app's stylesheet or theme class. Styles are
 * inline for that reason, and follow the OS colour scheme.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          colorScheme: "light dark",
          lineHeight: 1.6,
        }}
      >
        <title>Something went wrong</title>
        <ErrorReporter digest={error.digest} />
        <main style={{ maxWidth: "26rem", width: "100%" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 500, margin: "0 0 0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 0.75rem", opacity: 0.75, fontSize: "0.9375rem" }}>
            The app failed to start. Nothing you&apos;ve logged has been lost, and this has
            already been reported.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              minHeight: "2.75rem",
              width: "100%",
              borderRadius: "0.5rem",
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1rem", opacity: 0.6, fontSize: "0.8125rem", textAlign: "center" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
