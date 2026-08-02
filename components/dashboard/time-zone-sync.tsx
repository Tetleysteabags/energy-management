"use client";

import { useEffect, useRef } from "react";
import { saveTimeZone } from "@/app/actions/profile";

type TimeZoneSyncProps = {
  /** The zone currently stored on the profile. */
  current: string;
};

/**
 * Keeps `profiles.timezone` in step with the browser. Renders nothing.
 *
 * Only fires when the browser disagrees with what is stored, so the revalidate
 * inside the action cannot bounce back into another save.
 */
export function TimeZoneSync({ current }: TimeZoneSyncProps) {
  const reported = useRef<string | null>(null);

  useEffect(() => {
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserZone || browserZone === current || reported.current === browserZone) {
      return;
    }

    reported.current = browserZone;
    void saveTimeZone(browserZone);
  }, [current]);

  return null;
}
