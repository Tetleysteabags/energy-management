import { redirect } from "next/navigation";
import { CsvImportForm } from "@/components/import/csv-import-form";

export default async function ImportPage() {
  const supabase = await import("@/lib/supabase/server").then((mod) => mod.createClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Import history</h1>
        <p className="text-muted-foreground text-sm">
          Bring in past daily logs from a CSV. One row per day.
        </p>
      </div>
      <CsvImportForm />
    </div>
  );
}
