import { redirect } from "next/navigation";
import { EveningCheckInForm } from "@/components/check-in/evening-check-in-form";
import { parseLogDateParam } from "@/lib/check-in/log-date";
import { getCheckInContext } from "@/lib/check-in/queries";
import { getSupplementIntakeForDate } from "@/lib/supplements/queries";

type EveningCheckInPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function EveningCheckInPage({ searchParams }: EveningCheckInPageProps) {
  const params = await searchParams;
  const logDate = parseLogDateParam(params.date);
  const context = await getCheckInContext(logDate);

  if (!context) {
    redirect("/login");
  }

  const supplementIntake = (await getSupplementIntakeForDate(context.logDate)) ?? [];

  return (
    <EveningCheckInForm
      logDate={context.logDate}
      initialValues={context.today.evening}
      yesterdayValues={context.yesterday.evening}
      hintValues={context.hints.evening}
      alreadySubmitted={context.today.eveningSubmitted}
      trackCycle={context.trackCycle}
      supplementIntake={supplementIntake}
    />
  );
}
