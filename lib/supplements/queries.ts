import { createClient } from "@/lib/supabase/server";

export type Supplement = {
  id: string;
  name: string;
  is_active: boolean;
};

export type SupplementIntake = {
  supplementId: string;
  name: string;
  taken: boolean;
};

export async function getSupplementStack(): Promise<Supplement[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("supplements")
    .select("id, name, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function getSupplementIntakeForDate(
  logDate: string,
): Promise<SupplementIntake[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const stack = await getSupplementStack();
  if (!stack?.length) return [];

  const yesterday = new Date(`${logDate}T12:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().slice(0, 10);

  const { data: todayIntake } = await supabase
    .from("daily_supplement_intake")
    .select("supplement_id, taken")
    .eq("user_id", user.id)
    .eq("log_date", logDate);

  const { data: yesterdayIntake } = await supabase
    .from("daily_supplement_intake")
    .select("supplement_id, taken")
    .eq("user_id", user.id)
    .eq("log_date", yesterdayDate);

  const todayMap = new Map(todayIntake?.map((row) => [row.supplement_id, row.taken]));
  const yesterdayMap = new Map(
    yesterdayIntake?.map((row) => [row.supplement_id, row.taken]),
  );

  return stack.map((supplement) => {
    const hasToday = todayMap.has(supplement.id);
    const taken = hasToday
      ? (todayMap.get(supplement.id) ?? true)
      : (yesterdayMap.get(supplement.id) ?? true);

    return {
      supplementId: supplement.id,
      name: supplement.name,
      taken,
    };
  });
}
