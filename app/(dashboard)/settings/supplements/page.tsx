import Link from "next/link";
import { redirect } from "next/navigation";
import { SupplementManager } from "@/components/settings/supplement-manager";
import { getSupplementStack } from "@/lib/supplements/queries";

export default async function SupplementsSettingsPage() {
  const stack = await getSupplementStack();

  if (stack === null) redirect("/login");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/settings" className="text-muted-foreground text-sm hover:underline">
          ← Settings
        </Link>
        <h1 className="text-xl font-medium">Supplements</h1>
        <p className="text-muted-foreground text-sm">
          Your regular stack. Tap them off on the home screen each day.
        </p>
      </div>

      <SupplementManager stack={stack} />
    </div>
  );
}
