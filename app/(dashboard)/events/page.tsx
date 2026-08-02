import { redirect } from "next/navigation";
import { EventsManager } from "@/components/events/events-manager";
import { getRecentEvents } from "@/lib/events/queries";
import { getUserTimeZone } from "@/lib/check-in/timezone";

export default async function EventsPage() {
  const [events, timeZone] = await Promise.all([getRecentEvents(), getUserTimeZone()]);

  if (!events) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Events</h1>
        <p className="text-muted-foreground text-sm">Optional — a tap each, when you want to.</p>
      </div>

      <EventsManager events={events} timeZone={timeZone} />
    </div>
  );
}
