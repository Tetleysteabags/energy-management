"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSupplement, saveSupplementIntake } from "@/app/actions/supplements";
import type { SupplementIntake } from "@/lib/supplements/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SupplementsCardProps = {
  logDate: string;
  intake: SupplementIntake[];
};

export function SupplementsCard({ logDate, intake: initialIntake }: SupplementsCardProps) {
  const router = useRouter();
  const [intake, setIntake] = useState<SupplementIntake[]>(initialIntake);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  function persist(next: SupplementIntake[]) {
    setIntake(next);
    startTransition(async () => {
      await saveSupplementIntake({
        logDate,
        intake: next.map((item) => ({
          supplementId: item.supplementId,
          taken: item.taken,
        })),
      });
      router.refresh();
    });
  }

  function toggle(supplementId: string) {
    persist(
      intake.map((item) =>
        item.supplementId === supplementId ? { ...item, taken: !item.taken } : item,
      ),
    );
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await addSupplement(trimmed);
      if (result.id) {
        const next = [...intake, { supplementId: result.id, name: trimmed, taken: true }];
        setIntake(next);
        await saveSupplementIntake({
          logDate,
          intake: next.map((item) => ({
            supplementId: item.supplementId,
            taken: item.taken,
          })),
        });
        setNewName("");
        setShowAdd(false);
        router.refresh();
      }
    });
  }

  return (
    <section className="border-border/60 space-y-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Supplements</h2>
        {intake.length ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={() => setShowAdd((value) => !value)}
          >
            Add
          </Button>
        ) : null}
      </div>

      {intake.length ? (
        <div className="flex flex-wrap gap-2">
          {intake.map((item) => (
            <button
              key={item.supplementId}
              type="button"
              aria-pressed={item.taken}
              disabled={pending}
              onClick={() => toggle(item.supplementId)}
              className={cn(
                "min-h-10 rounded-lg border px-3 text-sm font-normal transition-colors",
                item.taken
                  ? "border-info/40 bg-info/10 text-foreground"
                  : "border-border bg-background text-muted-foreground line-through opacity-70",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Add your regular vitamins or supplements to tap them off each day.
        </p>
      )}

      {showAdd || !intake.length ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAdd();
            }}
            placeholder="e.g. Magnesium"
            className="h-10"
          />
          <Button
            type="button"
            className="h-10"
            onClick={handleAdd}
            disabled={pending || !newName.trim()}
          >
            Add
          </Button>
        </div>
      ) : null}
    </section>
  );
}
