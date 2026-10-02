"use server";

import { db } from "@/db";
import { participants } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isUniqueViolation } from "@/lib/db-errors";
import { formatTime } from "@/lib/date";
import { getEventForm } from "@/lib/events";
import { readParticipantInput, toParticipantValues, validateParticipantInput } from "@/lib/participants";

export type CheckInResult = { ok: true; checkedInAt: string } | { ok: false; error: string };

export async function checkIn(eventId: number, participantId: number): Promise<CheckInResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  // Only flips rows not yet checked in, so two staff checking in the same person can't
  // overwrite the original check-in time.
  const [row] = await db
    .update(participants)
    .set({ checkedInAt: new Date(), checkedInById: session.userId })
    .where(
      and(eq(participants.id, participantId), eq(participants.eventId, eventId), isNull(participants.checkedInAt))
    )
    .returning({ checkedInAt: participants.checkedInAt });

  revalidatePath(`/events/${eventId}`, "layout");

  if (!row) {
    const [existing] = await db
      .select({ checkedInAt: participants.checkedInAt })
      .from(participants)
      .where(and(eq(participants.id, participantId), eq(participants.eventId, eventId)));
    if (!existing) return { ok: false, error: "Participant not found." };
    return { ok: false, error: `Already checked in at ${formatTime(existing.checkedInAt)}.` };
  }
  return { ok: true, checkedInAt: row.checkedInAt!.toISOString() };
}

export async function undoCheckIn(eventId: number, participantId: number) {
  const session = await getSession();
  if (!session) redirect("/login");

  await db
    .update(participants)
    .set({ checkedInAt: null, checkedInById: null })
    .where(and(eq(participants.id, participantId), eq(participants.eventId, eventId)));

  revalidatePath(`/events/${eventId}`, "layout");
}

export type WalkInState = { error?: string; success?: string } | undefined;

/** Adds someone who wasn't registered and checks them in immediately. */
export async function addWalkIn(eventId: number, _: WalkInState, formData: FormData): Promise<WalkInState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const form = await getEventForm(eventId);
  const input = readParticipantInput(formData, form);
  const error = validateParticipantInput(input, form, { strict: false });
  if (error) return { error };

  const now = new Date();
  try {
    await db.insert(participants).values({
      ...toParticipantValues(input),
      status: "Walk-in",
      eventId,
      source: "walk_in",
      registeredAt: now,
      checkedInAt: now,
      checkedInById: session.userId,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { error: "This person is already registered — search for them and check them in instead." };
    }
    throw err;
  }

  revalidatePath(`/events/${eventId}`, "layout");
  revalidatePath("/");
  return { success: `${input.firstName} ${input.lastName} added and checked in.` };
}
