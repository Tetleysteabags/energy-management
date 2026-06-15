"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addQuickEvent } from "@/app/actions/events";
import { QUICK_EVENT_TYPES } from "@/lib/events/types";
import { Button } from "@/components/ui/button";

export function QuickAddEvents() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleAdd(eventType: string, label: string) {
    startTransition(async () => {
      await addQuickEvent({ eventType, label });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_EVENT_TYPES.map((event) => (
        <Button
          key={event.type}
          type="button"
          variant="outline"
          className="min-h-11 gap-2 font-normal"
          disabled={pending}
          onClick={() => handleAdd(event.type, event.label)}
        >
          <span aria-hidden>{event.icon}</span>
          {event.label}
        </Button>
      ))}
    </div>
  );
}
