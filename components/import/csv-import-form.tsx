"use client";

import { useState, useTransition } from "react";
import { importDailyLogsCsv } from "@/app/actions/import";
import { CSV_TEMPLATE } from "@/lib/csv/import";
import { Button } from "@/components/ui/button";

export function CsvImportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await importDailyLogsCsv(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(`Imported ${result.imported} days.`);
      event.currentTarget.reset();
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

      {message ? <p className="text-sm">{message}</p> : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <details className="text-sm">
        <summary className="text-muted-foreground cursor-pointer">Example format</summary>
        <pre className="bg-muted mt-2 overflow-x-auto rounded-lg p-3 text-xs">{CSV_TEMPLATE}</pre>
      </details>
    </div>
  );
}
