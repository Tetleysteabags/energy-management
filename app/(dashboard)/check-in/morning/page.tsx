import { redirect } from "next/navigation";
import { MorningCheckInForm } from "@/components/check-in/morning-check-in-form";
import { getCheckInContext } from "@/lib/check-in/queries";

export default async function MorningCheckInPage() {
  const context = await getCheckInContext();

  if (!context) {
    redirect("/login");
  }

  return (
    <MorningCheckInForm
      logDate={context.logDate}
      initialValues={context.today.morning}
      yesterdayValues={context.yesterday.morning}
      hintValues={context.hints.morning}
      alreadySubmitted={context.today.morningSubmitted}
    />
  );
}
