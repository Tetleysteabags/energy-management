"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatLogDateLabel,
  isToday,
  todayLogDate,
  yesterdayLogDate,
} from "@/lib/check-in/log-date";

type LogDatePickerProps = {
  logDate: string;
};

function last7LogDates(): string[] {
  const dates: string[] = [];
  let cursor = todayLogDate();
  for (let i = 0; i < 7; i++) {
    dates.push(cursor);
    cursor = yesterdayLogDate(cursor);
  }
  return dates;
}

function quickChipLabel(date: string): string {
  if (isToday(date)) return "Today";
  if (date === yesterdayLogDate()) return "Yesterday";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

export function LogDatePicker({ logDate }: LogDatePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function navigate(date: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (isToday(date)) {
        params.delete("date");
      } else {
        params.set("date", date);
      }
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/");
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {last7LogDates().map((date) => (
          <Button
            key={date}
            type="button"
            variant={date === logDate ? "secondary" : "outline"}
            size="sm"
            disabled={pending}
            className="min-h-9"
            onClick={() => navigate(date)}
          >
            {quickChipLabel(date)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="log-date-input" className="text-muted-foreground text-xs">
          Or pick a date
        </label>
        <Input
          id="log-date-input"
          type="date"
          value={logDate}
          max={todayLogDate()}
          disabled={pending}
          className="max-w-40"
          onChange={(event) => {
            if (event.target.value) navigate(event.target.value);
          }}
        />
        {!isToday(logDate) ? (
          <p className="text-muted-foreground w-full text-xs">{formatLogDateLabel(logDate)}</p>
        ) : null}
      </div>
    </section>
  );
}
