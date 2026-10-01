import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getBaseUrl, getEventCounts, getEventOrNotFound, publicEventPath } from "@/lib/events";
import { StatCard, percent } from "@/components/StatCard";
import { PublicLinkCard } from "./PublicLinkCard";
import { DeleteEventButton } from "./DeleteEventButton";

export default async function EventOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const event = await getEventOrNotFound((await params).id);
  const counts = (await getEventCounts(event.id)).get(event.id) ?? { registered: 0, checkedIn: 0 };
  const publicUrl = `${await getBaseUrl()}${publicEventPath(event.publicSlug)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered" value={counts.registered} />
        <StatCard label="Checked in" value={counts.checkedIn} />
        <StatCard label="Attendance rate" value={percent(counts.checkedIn, counts.registered)} />
      </div>

      <PublicLinkCard eventId={event.id} url={publicUrl} registrationOpen={event.registrationOpen} />

      {event.description && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
          <p className="text-sm text-gray-600 whitespace-pre-line">{event.description}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/events/${event.id}/check-in`}
          className="rounded-lg bg-er-green px-4 py-2 text-sm font-semibold text-white hover:bg-er-green/90 transition"
        >
          Start check-in
        </Link>
        <Link
          href={`/events/${event.id}/participants`}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          Manage participants
        </Link>
      </div>

      {session?.role === "admin" && (
        <section className="border border-red-200 rounded-xl p-6 bg-red-50/40">
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            Deleting the event also deletes its {counts.registered} participant record(s) and check-ins.
          </p>
          <DeleteEventButton eventId={event.id} eventName={event.name} />
        </section>
      )}
    </div>
  );
}
