"use client";

import { Info, X } from "lucide-react";
import type { PacingNote } from "@/lib/analysis/pacing";
import { useStoredValue } from "@/lib/hooks/use-stored-value";
import { Button } from "@/components/ui/button";

type PacingCardProps = {
  note: PacingNote | null;
  /** Day key so a dismissal only lasts for the current day. */
  dateKey: string;
};

export function PacingCard({ note, dateKey }: PacingCardProps) {
  // Treated as dismissed during SSR, so the note never flashes in and back out
  // for someone who already dismissed it today.
  const [dismissed, setDismissed] = useStoredValue(`pacing-dismissed:${dateKey}`, "1");

  if (!note || dismissed === "1") return null;

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
        onClick={() => setDismissed("1")}
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
