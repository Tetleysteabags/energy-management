"use client";

import { useTransition } from "react";
import { toggleTrackCycle } from "@/app/actions/cycle-settings";
import { Button } from "@/components/ui/button";

type CycleTrackingToggleProps = {
  enabled: boolean;
};

export function CycleTrackingToggle({ enabled }: CycleTrackingToggleProps) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleTrackCycle(enabled);
    });
  }

  return (
    <div className="border-border/60 space-y-3 rounded-lg border px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Cycle tracking</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Optional. Log period days to explore possible associations with your symptoms.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={handleToggle}
      >
        {pending ? "Saving…" : enabled ? "Turn off cycle tracking" : "Turn on cycle tracking"}
      </Button>
    </div>
  );
}
