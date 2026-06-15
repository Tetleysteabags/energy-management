import { redirect } from "next/navigation";
import { deleteEventAction } from "@/app/actions/events";
import { QuickAddEvents } from "@/components/events/quick-add-events";
import { formatEventTime, groupEventsByDay, QUICK_EVENT_TYPES } from "@/lib/events/types";
import { getRecentEvents } from "@/lib/events/queries";
import { Button } from "@/components/ui/button";

export default async function EventsPage() {
  const events = await getRecentEvents();

  if (!events) {
    redirect("/login");
  }

  const grouped = groupEventsByDay(events);
  const days = [...grouped.keys()].sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Events</h1>
        <p className="text-muted-foreground text-sm">Optional — a tap each, when you want to.</p>
      </div>

      <QuickAddEvents />

      <div className="space-y-6">
        {days.length ? (
          days.map((day) => (
            <section key={day} className="space-y-2">
              <h2 className="text-muted-foreground text-xs font-medium">
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </h2>
              <ul className="space-y-2">
                {grouped.get(day)?.map((event) => {
                  const icon =
                    QUICK_EVENT_TYPES.find((item) => item.type === event.event_type)?.icon ??
                    "•";
                  return (
                    <li
                      key={event.id}
                      className="border-border/60 flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="text-muted-foreground mr-2 tabular-nums">
                            {formatEventTime(event.occurred_at)}
                          </span>
                          <span aria-hidden>{icon}</span> {event.label}
                        </p>
                        {event.note ? (
                          <p className="text-muted-foreground mt-1 text-xs">{event.note}</p>
                        ) : null}
                      </div>
                      <form action={deleteEventAction.bind(null, event.id)}>
                        <Button type="submit" variant="ghost" size="xs" className="text-xs">
                          Remove
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">Nothing logged yet — that&apos;s fine.</p>
        )}
      </div>
    </div>
  );
}
