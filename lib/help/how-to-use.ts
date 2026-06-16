import {
  Activity,
  BookOpen,
  CalendarCheck,
  HeartPulse,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type HowToBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "wearables-link" };

export type HowToSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  blocks: HowToBlock[];
};

export const HOW_TO_PAGE = {
  title: "How to use this",
  subtitle: "The basics, in a minute. Tap any topic.",
} as const;

export const HOW_TO_SECTIONS: HowToSection[] = [
  {
    id: "what-this-is",
    title: "What this is",
    icon: BookOpen,
    defaultOpen: true,
    blocks: [
      {
        type: "paragraph",
        text: "A private place to notice how your days affect one another — how yesterday's activity, last night's sleep, and today's symptoms connect.",
      },
      {
        type: "paragraph",
        text: "Over time it looks for possible patterns in your own data. It doesn't diagnose anything, and it's just for you.",
      },
    ],
  },
  {
    id: "daily-check-ins",
    title: "Your daily check-ins",
    icon: CalendarCheck,
    blocks: [
      { type: "paragraph", text: "Two quick check-ins, about a minute total:" },
      {
        type: "bullets",
        items: ["Morning — how you're feeling.", "Evening — what your day was like."],
      },
      {
        type: "paragraph",
        text: 'Both come pre-filled with yesterday\'s answers, so most days you just adjust what changed — or tap "Same as yesterday". Missing a day is completely fine; nothing breaks.',
      },
    ],
  },
  {
    id: "logging-through-day",
    title: "Logging through the day",
    icon: Activity,
    blocks: [
      {
        type: "paragraph",
        text: "On the home screen you can tap to log a nap, walk, or meeting and set how long it was. This is optional — the daily check-ins are the main thing.",
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
        text: 'Once there\'s enough data, it surfaces possible patterns — like "busy days tend to be followed by lower energy."',
      },
      {
        type: "paragraph",
        text: 'At first you\'ll see "collecting data" — that\'s normal; it usually takes a few weeks. Everything it shows is a lead to watch, never proof of cause, and it will never tell you to do more.',
      },
    ],
  },
  {
    id: "connect-wearable",
    title: "Connect your Fitbit or watch",
    icon: HeartPulse,
    blocks: [
      {
        type: "paragraph",
        text: "To bring in sleep and recovery data automatically:",
      },
      {
        type: "steps",
        items: [
          "Go to More → Wearables.",
          "Tap Connect.",
          "Sign in with the Google account your Fitbit or Pixel Watch uses.",
          "Approve read-only access to sleep, heart rate, and activity.",
        ],
      },
      {
        type: "paragraph",
        text: "That's it — it syncs by itself each morning. New data can take a day to appear, and you can disconnect any time.",
      },
      { type: "wearables-link" },
    ],
  },
  {
    id: "what-this-isnt",
    title: "What this isn't",
    icon: BookOpen,
    blocks: [
      {
        type: "paragraph",
        text: "This isn't medical advice or a diagnosis. If you're feeling unwell or worried, talk to a doctor.",
      },
      {
        type: "paragraph",
        text: "When you want to share what you're seeing, the Reports page makes a clean summary for your clinician.",
      },
    ],
  },
];
