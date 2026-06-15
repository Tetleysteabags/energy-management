import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runExploreAction } from "@/app/actions/explore";
import { ExploreForm } from "@/components/explore/explore-form";

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Explore</h1>
        <p className="text-muted-foreground text-sm">Ask a question — see a raw comparison.</p>
      </div>
      <ExploreForm initialResult={null} onQuery={runExploreAction} />
    </div>
  );
}
