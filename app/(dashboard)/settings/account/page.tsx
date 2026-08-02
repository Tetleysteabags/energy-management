import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { createClient } from "@/lib/supabase/server";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/settings" className="text-muted-foreground text-sm hover:underline">
          ← Settings
        </Link>
        <h1 className="text-xl font-medium">Your account &amp; data</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {user.email}
        </p>
      </div>

      <section className="border-border/60 space-y-3 rounded-lg border px-4 py-4">
        <h2 className="text-sm font-medium">Signing in</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Set or change a password, or connect Google as another way in.
        </p>
        <Link
          href="/welcome"
          className="border-input bg-background hover:bg-muted inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-3 text-sm"
        >
          Manage sign-in options
        </Link>
      </section>

      <section className="border-border/60 space-y-3 rounded-lg border px-4 py-4">
        <h2 className="text-sm font-medium">Take a copy</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your check-ins as a spreadsheet file — yours to keep, share with a clinician, or move
          somewhere else.
        </p>
        <a
          href="/api/reports/export"
          className="border-input bg-background hover:bg-muted inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-3 text-sm"
        >
          Download my data (CSV)
        </a>
      </section>

      <section className="border-border/60 space-y-3 rounded-lg border px-4 py-4">
        <h2 className="text-sm font-medium">Where your data lives</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your logs are stored in this app&apos;s database and are visible only to you — no one
          else&apos;s account can read them. Nothing is sold, and nothing is shared with advertisers
          or researchers.{" "}
          <Link href="/privacy" className="text-foreground underline-offset-4 hover:underline">
            Full privacy notice
          </Link>
          .
        </p>
      </section>

      <section className="border-border/60 space-y-3 rounded-lg border px-4 py-4">
        <h2 className="text-sm font-medium">Delete everything</h2>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
