"use client";

import { useState, useTransition } from "react";
import { importDailyLogsCsv } from "@/app/actions/import";
import { CSV_TEMPLATE } from "@/lib/csv/import";
import { Button } from "@/components/ui/button";

export function CsvImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIssues([]);

    // Held onto here because `event.currentTarget` is cleared before the
    // transition resolves.
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await importDailyLogsCsv(formData);
      setIssues(result.issues ?? []);

      if (result.error) {
        setError(result.error);
        return;
      }

      const skipped = result.skipped ?? 0;
      setMessage(
        skipped > 0
          ? `Imported ${result.imported} day(s). Skipped ${skipped} row(s).`
          : `Imported ${result.imported} day(s).`,
      );
      form.reset();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm"
          required
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Importing…" : "Import CSV"}
        </Button>
      </form>

      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {issues.length ? (
        <div className="border-border/60 space-y-1 rounded-lg border px-3 py-2">
          <p className="text-sm font-medium">Rows that couldn&apos;t be read</p>
          <ul className="text-muted-foreground space-y-1 text-xs">
            {issues.map((issue) => (
              <li key={issue}>· {issue}</li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">
            Fix those lines and import again — anything already brought in stays.
          </p>
        </div>
      ) : null}

      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer">Example format</summary>
        <pre className="bg-muted mt-2 overflow-x-auto rounded-lg p-3 text-xs">{CSV_TEMPLATE}</pre>
      </details>
    </div>
  );
}
