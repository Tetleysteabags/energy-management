"use client";

import { useEffect, useState } from "react";

type LocalTimeProps = {
  iso: string;
  className?: string;
};

export function LocalTime({ iso, className }: LocalTimeProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(
      new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }, [iso]);

  return (
    <span className={className} suppressHydrationWarning>
      {text || "\u00a0"}
    </span>
  );
}

export function LocalTimeRange({
  occurredAt,
  durationMinutes,
  className,
}: {
  occurredAt: string;
  durationMinutes: number | null;
  className?: string;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    const start = new Date(occurredAt).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    if (durationMinutes == null || durationMinutes <= 0) {
      setText(start);
      return;
    }

    const end = new Date(new Date(occurredAt).getTime() + durationMinutes * 60_000);
    const endLabel = end.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    setText(`${start} – ${endLabel}`);
  }, [occurredAt, durationMinutes]);

  return (
    <span className={className} suppressHydrationWarning>
      {text || "\u00a0"}
    </span>
  );
}
