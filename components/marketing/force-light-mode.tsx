"use client";

import { useEffect } from "react";

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function restoreTheme() {
  try {
    const stored = localStorage.getItem("theme") || "system";
    const dark = stored === "dark" || (stored === "system" && prefersDark());
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    document.documentElement.classList.remove("dark");
  }
}

/** Forces light appearance on marketing pages without changing the saved theme. */
export function ForceLightMode() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {
      restoreTheme();
    };
  }, []);

  return null;
}
