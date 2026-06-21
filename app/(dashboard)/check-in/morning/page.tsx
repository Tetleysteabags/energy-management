import { redirect } from "next/navigation";
import { MorningCheckInForm } from "@/components/check-in/morning-check-in-form";
import { parseLogDateParam } from "@/lib/check-in/log-date";
import { getCheckInContext } from "@/lib/check-in/queries";

type MorningCheckInPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function MorningCheckInPage({ searchParams }: MorningCheckInPageProps) {
  const params = await searchParams;
  const logDate = parseLogDateParam(params.date);
  const context = await getCheckInContext(logDate);

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
