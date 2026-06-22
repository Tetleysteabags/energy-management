"use client";

import Link from "next/link";
import { memo, useMemo, useState, useTransition } from "react";
import { capacityColor, formatDaySummary } from "@/lib/trends/capacity";
import type { TrendDay } from "@/lib/trends/queries";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CapacityHeatmapProps = {
  days: TrendDay[];
};

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(date);
  result.setDate(result.getDate() + diff);
  return result;
}

const HeatmapCell = memo(function HeatmapCell({
  day,
  selected,
  onSelect,
}: {
  day: TrendDay;
  selected: boolean;
  onSelect: (day: TrendDay) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${day.logDate}, capacity ${day.capacity ?? "no entry"}`}
      onClick={() => onSelect(day)}
      className={cn(
        "relative aspect-square rounded-md border border-transparent transition-opacity",
        selected && "ring-1 ring-info/40",
      )}
      style={{ backgroundColor: capacityColor(day.capacity) }}
    >
      {day.isCrash ? (
        <span className="bg-foreground/70 absolute top-1 right-1 size-1.5 rounded-full" />
      ) : null}
    </button>
  );
});

export function CapacityHeatmap({ days }: CapacityHeatmapProps) {
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<TrendDay | null>(null);

  const weeks = useMemo(() => {
    if (!days.length) return [] as (TrendDay | null)[][];

    const byDate = new Map(days.map((day) => [day.logDate, day]));
    const first = new Date(`${days[0].logDate}T12:00:00`);
    const last = new Date(`${days[days.length - 1].logDate}T12:00:00`);

    const gridStart = startOfWeek(first);
    const gridEnd = startOfWeek(last);
    gridEnd.setDate(gridEnd.getDate() + 6);

    const weeksOut: (TrendDay | null)[][] = [];
    const cursor = new Date(gridStart);

    while (cursor <= gridEnd) {
      const week: (TrendDay | null)[] = [];
      for (let i = 0; i < 7; i += 1) {
        const iso = cursor.toISOString().slice(0, 10);
        week.push(byDate.get(iso) ?? null);
        cursor.setDate(cursor.getDate() + 1);
      }
      weeksOut.push(week);
    }

    return weeksOut;
  }, [days]);

  function selectDay(day: TrendDay) {
    startTransition(() => {
      setSelected(day);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-muted-foreground text-center text-[10px]">
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1.5">
            {week.map((day, dayIndex) => {
              if (!day) {
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="border-border/60 aspect-square rounded-md border border-dashed"
                    aria-hidden
                  />
                );
              }

              return (
                <HeatmapCell
                  key={day.logDate}
                  day={day}
                  selected={selected?.logDate === day.logDate}
                  onSelect={selectDay}
                />
              );
            })}
          </div>
        ))}
      </div>

      {selected ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">{formatDaySummary(selected)}</p>
          <Link
            href={`/?date=${selected.logDate}`}
            className="text-muted-foreground text-sm hover:underline"
          >
            Edit this day
          </Link>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">Tap a day for a one-line summary.</p>
      )}
    </div>
  );
}
