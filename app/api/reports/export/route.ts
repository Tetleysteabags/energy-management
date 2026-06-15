import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: true });

  const headers = [
    "log_date",
    "sleep_quality",
    "morning_fatigue",
    "physical_load",
    "cognitive_load",
    "capacity",
    "evening_fatigue",
    "pem",
    "notes",
  ];

  const lines = [
    headers.join(","),
    ...(rows ?? []).map((row) =>
      headers
        .map((header) => {
          const value = row[header as keyof typeof row];
          if (value == null) return "";
          const text = String(value).replaceAll('"', '""');
          return text.includes(",") ? `"${text}"` : text;
        })
        .join(","),
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="recovery-tracker-export.csv"',
    },
  });
}
