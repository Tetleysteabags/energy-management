"use client";

import { useState, useTransition } from "react";
import { WORKOUT_SUBTYPES, WORKOUT_TYPE } from "@/lib/events/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type QuickEventType = { type: string; label: string; icon: string };

type QuickAddBarProps = {
  eventTypes: readonly QuickEventType[];
  disabled?: boolean;
  /** Smaller chips for the home Today card. */
  compact?: boolean;
  onAdd: (eventType: string, label: string) => void;
};

export function QuickAddBar({ eventTypes, disabled, compact, onAdd }: QuickAddBarProps) {
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [, startTransition] = useTransition();

  function close() {
    startTransition(() => {
      setWorkoutOpen(false);
      setOtherOpen(false);
      setCustomText("");
    });
  }

  function handleChip(type: string, label: string) {
    if (type === WORKOUT_TYPE) {
      startTransition(() => {
        setOtherOpen(false);
        setWorkoutOpen((open) => !open);
      });
      return;
    }
    onAdd(type, label);
  }

  function addWorkout(label: string) {
    onAdd(WORKOUT_TYPE, label);
    close();
  }

  function submitCustom() {
    const text = customText.trim();
    addWorkout(text.length ? text : "Workout");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {eventTypes.map((event) => (
          <Button
            key={event.type}
            type="button"
            variant={event.type === WORKOUT_TYPE && workoutOpen ? "default" : "outline"}
            size={compact ? "sm" : "default"}
            className={compact ? "min-h-10 gap-1.5 font-normal" : "min-h-11 gap-2 font-normal"}
            disabled={disabled}
            onClick={() => handleChip(event.type, event.label)}
          >
            <span aria-hidden>{event.icon}</span>
            {event.label}
          </Button>
        ))}
      </div>

      {workoutOpen ? (
        <div className="border-border/60 bg-secondary/30 space-y-2 rounded-lg border px-3 py-2">
          <p className="text-muted-foreground text-xs">What kind of workout?</p>
          <div className="flex flex-wrap gap-1.5">
            {WORKOUT_SUBTYPES.map((subtype) => (
              <Button
                key={subtype}
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 font-normal"
                disabled={disabled}
                onClick={() => addWorkout(subtype)}
              >
                {subtype}
              </Button>
            ))}
            <Button
              type="button"
              variant={otherOpen ? "default" : "outline"}
              size="sm"
              className="min-h-9 font-normal"
              disabled={disabled}
              onClick={() => startTransition(() => setOtherOpen((open) => !open))}
            >
              Other
            </Button>
          </div>

          {otherOpen ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submitCustom();
              }}
            >
              <Input
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder="e.g. Swimming"
                disabled={disabled}
                autoFocus
                maxLength={60}
              />
              <Button type="submit" size="sm" disabled={disabled || !customText.trim()}>
                Add
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
