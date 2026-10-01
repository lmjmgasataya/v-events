import { and, asc, eq, ilike, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { getEventOrNotFound } from "@/lib/events";
import { SearchBox } from "@/components/SearchBox";
import { AddParticipantModal } from "./AddParticipantModal";
import { ImportParticipantsModal } from "./ImportParticipantsModal";
import { ParticipantsTable } from "./ParticipantsTable";
import { FilterLinks } from "./FilterLinks";

type Filter = "all" | "checked-in" | "not-checked-in";

export default async function ParticipantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const event = await getEventOrNotFound((await params).id);
  const { q = "", filter: filterParam } = await searchParams;
  const filter: Filter = filterParam === "checked-in" || filterParam === "not-checked-in" ? filterParam : "all";

  const conditions: (SQL | undefined)[] = [eq(participants.eventId, event.id)];
  const term = q.trim();
  if (term) {
    const like = `%${term}%`;
    conditions.push(
      or(
        ilike(participants.firstName, like),
        ilike(participants.lastName, like),
        ilike(participants.contactNumber, like)
      )
    );
  }
  if (filter === "checked-in") conditions.push(isNotNull(participants.checkedInAt));
  if (filter === "not-checked-in") conditions.push(isNull(participants.checkedInAt));

  const rows = await db
    .select()
    .from(participants)
    .where(and(...conditions))
    .orderBy(asc(participants.lastName), asc(participants.firstName));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <SearchBox defaultValue={q} placeholder="Search name or contact…" />
          <FilterLinks current={filter} />
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={`/events/${event.id}/export?type=participants`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Export CSV
          </a>
          <ImportParticipantsModal eventId={event.id} />
          <AddParticipantModal eventId={event.id} />
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {rows.length} participant{rows.length === 1 ? "" : "s"}
        {(term || filter !== "all") && " matching"}
      </p>

      <ParticipantsTable eventId={event.id} rows={rows} />
    </div>
  );
}
