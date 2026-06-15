import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LINKS = [
  { href: "/settings/crash-rule", label: "Crash rule", hint: "Versioned, plain-language" },
  { href: "/settings/notes", label: "Notes tagging", hint: "LLM opt-in, default off" },
  { href: "/wearables", label: "Wearables", hint: "Connect or sync" },
  { href: "/import", label: "Import CSV", hint: "Bring in past logs" },
  { href: "/settings/supplements", label: "Supplements", hint: "Manage your stack" },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/more" className="text-muted-foreground text-sm hover:underline">
          ← More
        </Link>
        <h1 className="text-xl font-medium">Settings</h1>
      </div>
      <div className="space-y-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border-border/60 block rounded-lg border px-4 py-3"
          >
            <p className="text-sm font-medium">{link.label}</p>
            <p className="text-muted-foreground text-xs">{link.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
