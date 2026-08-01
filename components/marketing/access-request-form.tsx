"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAccessRequestUrl } from "@/lib/marketing/access-request";

type AccessRequestFormProps = {
  actionUrl?: string;
};

export function AccessRequestForm({
  actionUrl = getAccessRequestUrl(),
}: AccessRequestFormProps) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch(actionUrl, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Something went wrong sending your request.");
      }

      setSent(true);
      form.reset();
    } catch {
      setError("Couldn't send that just now. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm leading-relaxed" role="status">
        Thanks — your request is in. Someone will follow up when a spot is available.
      </p>
    );
  }

  return (
    <form method="POST" action={actionUrl} onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="access-name">Name</Label>
        <Input id="access-name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="access-email">Email</Label>
        <Input
          id="access-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="access-note">Anything to share (optional)</Label>
        <textarea
          id="access-note"
          name="message"
          rows={3}
          className="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full min-w-0 rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3"
          placeholder="A short note is fine."
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="min-h-11 w-full font-normal" disabled={pending}>
        {pending ? "Sending…" : "Request access"}
      </Button>
    </form>
  );
}
