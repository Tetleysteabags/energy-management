"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import type { PacingNote } from "@/lib/analysis/pacing";
import { Button } from "@/components/ui/button";

type PacingCardProps = {
  note: PacingNote | null;
  /** Day key so a dismissal only lasts for the current day. */
  dateKey: string;
};

export function PacingCard({ note, dateKey }: PacingCardProps) {
  const storageKey = `pacing-dismissed:${dateKey}`;
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // localStorage unavailable — show the note rather than hide it.
    }
  }, [storageKey]);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // ignore persistence failures
    }
  }

  // Gate on mount to avoid an SSR/client hydration mismatch on the stored flag.
  if (!note || !mounted || dismissed) return null;

  return (
    <div className="border-info/30 bg-info/10 flex items-start gap-3 rounded-lg border px-4 py-3">
      <Info className="text-info mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1 text-sm leading-relaxed">{note.message}</p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        className="text-muted-foreground -mr-1 -mt-1 shrink-0"
        onClick={dismiss}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
