import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { events, type Event } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getEventCounts } from "@/lib/events";
import { formatDateTime } from "@/lib/date";
import { primaryBtnCls } from "@/components/form";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [allEvents, counts] = await Promise.all([
    db.select().from(events).orderBy(desc(events.startsAt)),
    getEventCounts(),
  ]);

  const { upcoming, past } = splitByEnded(allEvents);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-er-navy">Events</h1>
        <Link href="/events/new" className={primaryBtnCls}>
          + New event
        </Link>
      </div>

      {allEvents.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600 font-medium">No events yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first event to get a shareable registration link.</p>
        </div>
      ) : (
        <>
          <EventSection title="Upcoming & ongoing" items={upcoming} counts={counts} empty="Nothing scheduled." />
          <EventSection title="Past" items={past} counts={counts} empty="No past events." />
        </>
      )}
    </div>
  );
}

/** An event stays "upcoming" until it ends (or until a day after it starts, if no end is set). */
function splitByEnded(allEvents: Event[]) {
  const now = Date.now();
  const isPast = (e: Event) => (e.endsAt ?? new Date(e.startsAt.getTime() + 24 * 60 * 60 * 1000)).getTime() < now;
  return {
    upcoming: allEvents.filter((e) => !isPast(e)).reverse(), // soonest first
    past: allEvents.filter(isPast),
  };
}

function EventSection({
  title,
  items,
  counts,
  empty,
}: {
  title: string;
  items: Event[];
  counts: Map<number, { registered: number; checkedIn: number }>;
  empty: string;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((event) => {
            const c = counts.get(event.id) ?? { registered: 0, checkedIn: 0 };
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-er-navy/40 hover:shadow-sm transition flex flex-col gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                    {!event.registrationOpen && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Closed</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{formatDateTime(event.startsAt)}</p>
                  {event.venue && <p className="text-xs text-gray-500">{event.venue}</p>}
                </div>
                <div className="flex gap-6 text-sm">
                  <span>
                    <span className="font-bold text-er-navy">{c.registered}</span>{" "}
                    <span className="text-gray-500">registered</span>
                  </span>
                  <span>
                    <span className="font-bold text-er-green">{c.checkedIn}</span>{" "}
                    <span className="text-gray-500">checked in</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
