import {
  Activity,
  BookOpen,
  CalendarCheck,
  HeartPulse,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { HowToSection } from "@/lib/help/how-to-use";

export const HOW_IT_WORKS_PAGE = {
  brand: "Recovery tracker",
  title: "How this works",
  subtitle:
    "A private place to notice how your days affect one another — without diagnosing, judging, or pushing you to do more.",
} as const;

/** Public intro copy — same calm tone as in-app help, without account-only links. */
export const HOW_IT_WORKS_SECTIONS: HowToSection[] = [
  {
    id: "what-this-is",
    title: "What this is",
    icon: BookOpen,
    defaultOpen: true,
    blocks: [
      {
        type: "paragraph",
        text: "You log a short morning and evening check-in. Optionally connect a Fitbit or watch for sleep, HRV, and resting heart rate.",
      },
      {
        type: "paragraph",
        text: "Over time it may surface possible patterns in your own data — associations to watch, never diagnoses or proof of cause. That uses ordinary lagged statistics on a fixed list of questions, not machine learning or AI.",
      },
    ],
  },
  {
    id: "daily-check-ins",
    title: "Daily check-ins",
    icon: CalendarCheck,
    blocks: [
      {
        type: "paragraph",
        text: "Two quick check-ins, about a minute total:",
      },
      {
        type: "bullets",
        items: [
          "Morning — how you slept and how you're feeling.",
          "Evening — load, capacity, symptoms, and simple day factors.",
        ],
      },
      {
        type: "paragraph",
        text: 'Fields start from yesterday, so most days you only change what\'s different — or tap "Same as yesterday". Missing a day is fine.',
      },
    ],
  },
  {
    id: "logging-through-day",
    title: "Optional logging through the day",
    icon: Activity,
    blocks: [
      {
        type: "paragraph",
        text: "You can tap to log naps, walks, calls, or flares with a duration. Helpful when you want more detail — not required for the basics.",
      },
    ],
  },
  {
    id: "what-it-does",
    title: "What it does with your data",
    icon: Sparkles,
    blocks: [
      {
        type: "paragraph",
        text: 'Once there\'s enough history, it may surface leads like "busy days tend to be followed by lower energy." At first you\'ll see "collecting data" — that usually takes a few weeks.',
      },
      {
        type: "paragraph",
        text: "Method: not machine learning or AI. A small fixed set of next-day questions is tested with lagged statistical associations (yesterday → today), accounting for how you felt the day before — not simple same-day correlation, and not open-ended fishing for links.",
      },
      {
        type: "paragraph",
        text: "It never tells you to push harder. Insights stay cautious: possible patterns, not verdicts.",
      },
    ],
  },
  {
    id: "wearables",
    title: "Wearables (optional)",
    icon: HeartPulse,
    blocks: [
      {
        type: "paragraph",
        text: "Connect Fitbit or Google Health for overnight recovery metrics. Sync is read-only; you can disconnect any time.",
      },
    ],
  },
  {
    id: "what-this-isnt",
    title: "What this isn't",
    icon: BookOpen,
    blocks: [
      {
        type: "paragraph",
        text: "Not medical advice and not a diagnosis. If you're unwell or worried, talk to a clinician. Reports can help you share a calm summary with them later.",
      },
    ],
  },
];
