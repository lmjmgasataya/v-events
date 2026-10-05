import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { getEventOrNotFound } from "@/lib/events";
import { normalizeFormConfig } from "@/lib/form-config";
import { CheckInWorkspace, type CheckInRow } from "./CheckInWorkspace";

export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const event = await getEventOrNotFound((await params).id);

  const rows = await db
    .select({
      id: participants.id,
      firstName: participants.firstName,
      lastName: participants.lastName,
      nickname: participants.nickname,
      contactNumber: participants.contactNumber,
      serviceAttended: participants.serviceAttended,
      checkedInAt: participants.checkedInAt,
    })
    .from(participants)
    .where(eq(participants.eventId, event.id))
    .orderBy(asc(participants.lastName), asc(participants.firstName));

  const roster: CheckInRow[] = rows.map((r) => ({ ...r, checkedInAt: r.checkedInAt?.toISOString() ?? null }));

  return (
    <CheckInWorkspace eventId={event.id} eventName={event.name} roster={roster} form={normalizeFormConfig(event.form)} />
  );
}
