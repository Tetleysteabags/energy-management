"use client";

import { useState, useTransition } from "react";
import { addSupplement } from "@/app/actions/supplements";
import type { SupplementIntake } from "@/lib/supplements/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SupplementChipsProps = {
  intake: SupplementIntake[];
  onChange: (next: SupplementIntake[]) => void;
};

export function SupplementChips({ intake, onChange }: SupplementChipsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [, startUiTransition] = useTransition();

  function toggle(supplementId: string) {
    onChange(
      intake.map((item) =>
        item.supplementId === supplementId ? { ...item, taken: !item.taken } : item,
      ),
    );
  }

  function handleAdd() {
    startTransition(async () => {
      const result = await addSupplement(newName);
      if (result.id) {
        onChange([...intake, { supplementId: result.id, name: newName.trim(), taken: true }]);
        setNewName("");
        setShowAdd(false);
      }
    });
  }

  if (!intake.length && !showAdd) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">No regular supplements yet.</p>
        <Button
          type="button"
          variant="ghost"
          className="h-auto px-0 text-sm font-normal"
          onClick={() => startUiTransition(() => setShowAdd(true))}
        >
          Add one
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-normal">Supplements taken today</p>
      <div className="flex flex-wrap gap-2">
        {intake.map((item) => (
          <button
            key={item.supplementId}
            type="button"
            aria-pressed={item.taken}
            onClick={() => toggle(item.supplementId)}
            className={cn(
              "min-h-11 rounded-lg border px-4 text-sm font-normal transition-colors",
              item.taken
                ? "border-info/40 bg-info/10 text-foreground"
                : "border-border bg-background text-muted-foreground line-through opacity-70",
            )}
          >
            {item.name}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          className="min-h-11 font-normal"
          onClick={() => startUiTransition(() => setShowAdd((value) => !value))}
        >
          Add
        </Button>
      </div>

      {showAdd ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Magnesium"
          />
          <Button type="button" onClick={handleAdd} disabled={pending || !newName.trim()}>
            Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}
