import { Shield, type LucideIcon } from "lucide-react";

export type PrivacySection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export const DATA_PRIVACY = {
  title: "Data & privacy",
  icon: Shield as LucideIcon,
  intro:
    "This is a private, single-user health app. Your logs stay yours — not a product feed, not sold, not shared for ads.",
  sections: [
    {
      id: "gdpr",
      title: "GDPR & your rights",
      paragraphs: [
        "Health-related logs are special-category personal data under GDPR. The app is built for one person at a time, with access limited to your account.",
        "You can ask what we hold about you, ask for a copy, or ask us to correct something that is wrong. For access requests on this page, we only use the name, email, and optional note you send so we can reply.",
      ],
    },
    {
      id: "how-stored",
      title: "How it’s stored",
      paragraphs: [
        "Account and check-in data live in a Supabase Postgres database in an EU region, behind row-level security so each user only sees their own rows.",
        "Wearable sync (if you connect one) is read-only. There is no third-party analytics on your health data. Optional access requests are sent through Formspree so we can follow up by email.",
      ],
    },
    {
      id: "deleting",
      title: "Deleting your data",
      paragraphs: [
        "You can disconnect wearables any time. If you want your account and logs removed, email the same address you used for access (or the contact who invited you) and ask for deletion — we’ll remove your account data from the app database.",
        "Access-request messages may remain in the inbox used to handle invites until that mailbox is cleared.",
      ],
    },
  ] satisfies PrivacySection[],
} as const;
