"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSupplement, removeSupplement } from "@/app/actions/supplements";
import type { Supplement } from "@/lib/supplements/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SupplementManagerProps = {
  stack: Supplement[];
};

export function SupplementManager({ stack: initialStack }: SupplementManagerProps) {
  const router = useRouter();
  const [stack, setStack] = useState(initialStack);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await addSupplement(trimmed);
      if (result.id) {
        setStack((current) => [...current, { id: result.id!, name: trimmed, is_active: true }]);
        setNewName("");
        router.refresh();
      }
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeSupplement(id);
      setStack((current) => current.filter((item) => item.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleAdd();
          }}
          placeholder="e.g. Magnesium"
        />
        <Button type="button" onClick={handleAdd} disabled={pending || !newName.trim()}>
          Add
        </Button>
      </div>

      {stack.length ? (
        <ul className="space-y-2">
          {stack.map((item) => (
            <li
              key={item.id}
              className="border-border/60 flex items-center justify-between rounded-lg border px-4 py-3"
            >
              <span className="text-sm">{item.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={pending}
                onClick={() => handleRemove(item.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          No supplements yet. Add the ones you take regularly so you can tap them off
          on the home screen each day.
        </p>
      )}
    </div>
  );
}
