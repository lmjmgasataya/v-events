import { and, asc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { getEventOrNotFound } from "@/lib/events";
import { SearchBox } from "@/components/SearchBox";
import { AddParticipantModal } from "./AddParticipantModal";
import { ImportParticipantsModal } from "./ImportParticipantsModal";
import { ParticipantsTable } from "./ParticipantsTable";
import { FilterLinks } from "./FilterLinks";
import { parseSort } from "@/lib/sort";
import { SERVICE_OPTIONS } from "@/lib/constants";
import { PARTICIPANT_SORT_COLUMNS } from "./sortColumns";

type Filter = "all" | "checked-in" | "not-checked-in";

export default async function ParticipantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; filter?: string; sort?: string; dir?: string }>;
}) {
  const event = await getEventOrNotFound((await params).id);
  const { q = "", filter: filterParam, sort: sortParam, dir: dirParam } = await searchParams;
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

  const { sort, dir } = parseSort(sortParam, dirParam, PARTICIPANT_SORT_COLUMNS, "lastName");
  const column = participants[sort];
  const direction = dir === "asc" ? sql`asc` : sql`desc`;
  // Service sorts by time slot order (SERVICE_OPTIONS), with other named services after
  const primary =
    sort === "serviceAttended"
      ? sql`coalesce(array_position(ARRAY[${sql.join(
          SERVICE_OPTIONS.map((s) => sql`${s}`),
          sql`, `
        )}]::text[], ${column}), ${SERVICE_OPTIONS.length + 1})` // array_position is 1-based
      : column;
  // contactNumber stores '' for unknown, so treat it as blank too
  const blank = sort === "contactNumber" ? sql`nullif(${column}, '')` : column;

  const rows = await db
    .select()
    .from(participants)
    .where(and(...conditions))
    .orderBy(
      sql`${blank} is null`, // blanks always last, whichever direction
      sql`${primary} ${direction}`,
      asc(column),
      asc(participants.lastName),
      asc(participants.firstName)
    );

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

      <ParticipantsTable eventId={event.id} rows={rows} sort={sort} dir={dir} />
    </div>
  );
}
