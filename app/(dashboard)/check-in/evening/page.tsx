import { redirect } from "next/navigation";
import { EveningCheckInForm } from "@/components/check-in/evening-check-in-form";
import { getCheckInContext } from "@/lib/check-in/queries";
import { getSupplementIntakeForDate } from "@/lib/supplements/queries";

export default async function EveningCheckInPage() {
  const context = await getCheckInContext();

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
      supplementIntake={supplementIntake}
    />
  );
}
