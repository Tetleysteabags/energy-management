"use client";

import { useEffect, useState } from "react";
import { greetingForHour } from "@/lib/check-in/greeting";

/**
 * The greeting depends on the local time of day, which is only known on the
 * client. The server passes its best guess as `initial` so there's no layout
 * shift on first paint; we correct to the user's local hour after mount.
 */
export function Greeting({ initial }: { initial: string }) {
  const [greeting, setGreeting] = useState(initial);

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <h1 className="text-2xl font-medium tracking-tight" suppressHydrationWarning>
      {greeting}
    </h1>
  );
}
