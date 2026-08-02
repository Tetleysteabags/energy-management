"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a localStorage value without a mount effect.
 *
 * `useState` + `useEffect` would work but sets state during the effect, which
 * cascades an extra render on every mount. `useSyncExternalStore` is the shape
 * React provides for exactly this: an external source with a different value on
 * the server than in the browser.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Keeps two open tabs in step.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private browsing or storage disabled.
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Persistence is best-effort; the in-memory value still updates.
  }
  notify();
}

/**
 * `serverValue` is what renders during SSR and the first hydration pass. Pick
 * whichever value avoids a visible flash — usually the "hidden" one.
 */
export function useStoredValue(
  key: string,
  serverValue: string | null = null,
): [string | null, (value: string) => void] {
  const getSnapshot = useCallback(() => read(key), [key]);
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue = useCallback((next: string) => write(key, next), [key]);

  return [value, setValue];
}
