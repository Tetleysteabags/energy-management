import { redirect } from "next/navigation";
import { EveningCheckInForm } from "@/components/check-in/evening-check-in-form";
import { parseLogDateParam } from "@/lib/check-in/log-date";
import { getCheckInContext } from "@/lib/check-in/queries";
import { getUserTimeZone } from "@/lib/check-in/timezone";
import { getSupplementIntakeForDate } from "@/lib/supplements/queries";

type EveningCheckInPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function EveningCheckInPage({ searchParams }: EveningCheckInPageProps) {
  const params = await searchParams;
  const logDate = parseLogDateParam(params.date, await getUserTimeZone());
  const context = await getCheckInContext(logDate);

  if (!context) {
    redirect("/login");
  }

  const supplementIntake = (await getSupplementIntakeForDate(context.logDate)) ?? [];

  return (
    <EveningCheckInForm
      logDate={context.logDate}
      timeZone={context.timeZone}
      initialValues={context.today.evening}
      yesterdayValues={context.yesterday.evening}
      hintValues={context.hints.evening}
      alreadySubmitted={context.today.eveningSubmitted}
      trackCycle={context.trackCycle}
      supplementIntake={supplementIntake}
    />
  );
}
