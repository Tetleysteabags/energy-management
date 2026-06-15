import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/check-in";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/analysis", label: "Your patterns", hint: "Confirmed findings" },
  { href: "/explore", label: "Explore", hint: "Not evidence — raw questions" },
  { href: "/events", label: "Events", hint: "Optional granular log" },
  { href: "/reports", label: "Doctor summary", hint: "Printable + CSV export" },
  { href: "/settings", label: "Settings", hint: "Crash rule, notes, wearables" },
];

export default async function MorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">More</h1>
        <p className="text-muted-foreground text-sm">Account, settings, and deeper views.</p>
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

      <div className="border-border/60 space-y-4 rounded-lg border px-4 py-4">
        <div>
          <p className="text-sm font-medium">Signed in</p>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
