import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { getEventOrNotFound } from "@/lib/events";
import { normalizeFormConfig } from "@/lib/form-config";
import { EditParticipantForm } from "./EditParticipantForm";

export default async function EditParticipantPage({
  params,
}: {
  params: Promise<{ id: string; participantId: string }>;
}) {
  const { id, participantId } = await params;
  const event = await getEventOrNotFound(id);
  const pid = Number(participantId);
  if (!Number.isInteger(pid)) notFound();

  const [participant] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.id, pid), eq(participants.eventId, event.id)))
    .limit(1);
  if (!participant) notFound();

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Edit {participant.firstName} {participant.lastName}
      </h2>
      <EditParticipantForm eventId={event.id} participant={participant} form={normalizeFormConfig(event.form)} />
    </div>
  );
}
