import Link from "next/link";
import { redirect } from "next/navigation";
import { CrashRuleBuilder } from "@/components/settings/crash-rule-builder";
import { createClient } from "@/lib/supabase/server";

export default async function CrashRuleSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rule } = await supabase
    .from("crash_rule_versions")
    .select("*")
    .eq("user_id", user.id)
    .order("active_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/settings" className="text-muted-foreground text-sm hover:underline">
          ← Settings
        </Link>
        <h1 className="text-xl font-medium">Crash rule</h1>
        <p className="text-muted-foreground text-sm">
          Default: PEM ≥ 7 or capacity ≤ 3. Edit only if you want to.
        </p>
      </div>
      <CrashRuleBuilder
        initial={{
          matchMode: (rule?.match_mode as "any" | "all") ?? "any",
          pemThreshold: rule?.pem_threshold ?? 7,
          capacityThreshold: rule?.capacity_threshold ?? 3,
        }}
      />
    </div>
  );
}
