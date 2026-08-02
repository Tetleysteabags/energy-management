/**
 * Privacy notice content, kept beside the marketing copy so the wording stays
 * in one place. Every claim here is meant to describe what the code actually
 * does — if a data flow changes, this changes with it.
 */

/** Set NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL in Vercel. Until then the page says so plainly. */
export function getPrivacyContactEmail(): string | null {
  return process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || null;
}

/** Set NEXT_PUBLIC_DATA_REGION (e.g. "the EU (Frankfurt)") to name where the database lives. */
export function getDataRegion(): string | null {
  return process.env.NEXT_PUBLIC_DATA_REGION?.trim() || null;
}

export const PRIVACY_LAST_UPDATED = "1 August 2026";

export type PrivacySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    heading: "The short version",
    paragraphs: [
      "This app holds health information you type in about your own body. Only you can see it. It is never sold, never used for advertising, and never shared with researchers or insurers. You can download all of it or delete all of it at any time, from Settings → Your account & data.",
    ],
  },
  {
    heading: "What is stored",
    bullets: [
      "Your email address, and a password if you did not sign in with Google.",
      "Your timezone, so a check-in is filed on the day you actually made it.",
      "Daily check-ins: sleep, fatigue, brain fog, pain, chest feeling, dysautonomia, capacity, post-exertional malaise, and how heavy the day's physical, cognitive and social load felt.",
      "Day factors you toggle: alcohol and units, late caffeine, late meal, and — only if you switch cycle tracking on — whether you were on your period.",
      "Anything you type into the free-text notes field.",
      "Events you log, such as naps, walks, workouts and meetings.",
      "Supplements you add and whether you took them.",
      "Your crash rule settings and the days they marked as crashes.",
      "If, and only if, you connect a wearable: sleep duration and efficiency, resting heart rate, heart rate variability, steps, active minutes, blood oxygen, respiratory rate and skin temperature.",
    ],
  },
  {
    heading: "Who can see it",
    paragraphs: [
      "You, and nobody else using the app. Every table enforces row-level security in the database, so one account's queries cannot return another account's rows even if the app itself had a bug.",
      "The person who runs this app has administrative access to the database, as the operator of any self-hosted service does. That access exists to keep the service working and to help if you ask for help — not to read your logs.",
    ],
  },
  {
    heading: "Why it is stored",
    paragraphs: [
      "Solely to show you your own history and look for patterns in it. Under UK and EU data protection law this is special-category health data, and the basis for holding it is your explicit consent — given by creating an account and entering data. You can withdraw that consent at any time by deleting your account, which erases the data with it.",
    ],
  },
  {
    heading: "Who else is involved",
    bullets: [
      "Supabase — hosts the database and handles sign-in.",
      "Vercel — hosts and serves the app itself.",
      "Google — only if you choose to connect Fitbit or Google Health. The connection is read-only, covers sleep, activity and health metrics, and you can disconnect it whenever you like.",
      "Formspree — only if you fill in the request-access form on the public page. That form sends a name, an email address and an optional note. It is not connected to your health data.",
    ],
    paragraphs: [
      "There is no advertising, no analytics or tracking scripts, and no third-party cookies. Your notes are not sent to any language model or AI service.",
    ],
  },
  {
    heading: "How long it is kept",
    paragraphs: [
      "Until you delete it. Deleting your account removes your logs, events, supplements, settings, notes and any wearable readings immediately and permanently. Backups taken before the deletion age out on the hosting provider's own retention schedule.",
    ],
  },
  {
    heading: "Your rights",
    bullets: [
      "See it — everything you have entered is visible in the app.",
      "Take a copy — Settings → Your account & data → Download my data, or the CSV on the Doctor summary page.",
      "Correct it — every check-in can be edited for up to 90 days.",
      "Delete it — Settings → Your account & data → Delete my account. This is immediate and cannot be undone.",
      "Complain — if you are in the UK you can raise a concern with the ICO; in the EU, with your national data protection authority.",
    ],
  },
  {
    heading: "This is not medical advice",
    paragraphs: [
      "The patterns this app surfaces are statistical associations found in your own logs. They are not diagnoses, not predictions, and not treatment advice. An association can appear by chance, or because of something the app never recorded.",
      "Nothing here is a substitute for a clinician who knows your history. Do not start, stop or change any treatment, medication or pacing plan on the strength of what this app shows you. If you feel unwell, seek medical care.",
    ],
  },
];
