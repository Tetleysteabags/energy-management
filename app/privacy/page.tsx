import Link from "next/link";
import type { Metadata } from "next";
import {
  getDataRegion,
  getPrivacyContactEmail,
  PRIVACY_LAST_UPDATED,
  PRIVACY_SECTIONS,
} from "@/lib/marketing/privacy";

export const metadata: Metadata = {
  title: "Privacy — Recovery tracker",
  description: "What this app stores, who can see it, and how to get it back or delete it.",
};

export default function PrivacyPage() {
  const contactEmail = getPrivacyContactEmail();
  const dataRegion = getDataRegion();

  return (
    <div className="bg-muted/30 flex min-h-full flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <header className="space-y-2">
          <h1 className="text-xl font-medium">Privacy</h1>
          <p className="text-muted-foreground text-sm">Last updated {PRIVACY_LAST_UPDATED}.</p>
        </header>

        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-sm font-medium">{section.heading}</h2>
            {section.bullets ? (
              <ul className="text-muted-foreground space-y-1.5 text-sm leading-relaxed">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>· {bullet}</li>
                ))}
              </ul>
            ) : null}
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="text-muted-foreground text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Where it is stored</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {dataRegion
              ? `The database is hosted by Supabase in ${dataRegion}.`
              : "The database is hosted by Supabase. Ask the person who invited you which region it runs in."}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Getting in touch</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {contactEmail ? (
              <>
                For anything about your data, email{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {contactEmail}
                </a>
                .
              </>
            ) : (
              "For anything about your data, contact the person who invited you to the app."
            )}
          </p>
        </section>

        <div className="border-border/60 flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-sm">
          <Link href="/how-it-works" className="text-foreground underline-offset-4 hover:underline">
            How this works
          </Link>
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
