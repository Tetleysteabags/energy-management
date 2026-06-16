import { redirect } from "next/navigation";
import { HowToUseAccordion } from "@/components/help/how-to-use-accordion";
import { HOW_TO_PAGE } from "@/lib/help/how-to-use";
import { createClient } from "@/lib/supabase/server";

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: connections } = await supabase
    .from("wearable_connections")
    .select("status")
    .eq("user_id", user.id);

  const wearableConnected = Boolean(
    connections?.some((row) => row.status === "connected"),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">{HOW_TO_PAGE.title}</h1>
        <p className="text-muted-foreground text-sm italic">{HOW_TO_PAGE.subtitle}</p>
      </div>

      <HowToUseAccordion wearableConnected={wearableConnected} />
    </div>
  );
}
