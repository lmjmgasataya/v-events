"use server";

import { db } from "@/db";
import { participants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { mapParticipantHeaders, parseCsv } from "@/lib/csv";
import { parseRegistrationDate } from "@/lib/date";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  normalizeContactNumber,
  readParticipantInput,
  toParticipantValues,
  validateParticipantInput,
} from "@/lib/participants";
import { DEFAULT_STATUS } from "@/lib/constants";
import { withToast } from "@/lib/toast";

export type ParticipantFormState = { error?: string; success?: string } | undefined;

const DUPLICATE_MESSAGE = "This person (same name and contact number) is already in this event.";

function revalidateEvent(eventId: number) {
  revalidatePath(`/events/${eventId}`, "layout");
  revalidatePath("/");
}

export async function addParticipant(
  eventId: number,
  _: ParticipantFormState,
  formData: FormData
): Promise<ParticipantFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const input = readParticipantInput(formData);
  const error = validateParticipantInput(input, { requireContact: false });
  if (error) return { error };

  try {
    await db.insert(participants).values({ ...toParticipantValues(input), eventId, source: "manual" });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: DUPLICATE_MESSAGE };
    throw err;
  }

  revalidateEvent(eventId);
  return { success: `${input.firstName} ${input.lastName} added.` };
}

export async function updateParticipant(
  eventId: number,
  participantId: number,
  _: ParticipantFormState,
  formData: FormData
): Promise<ParticipantFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const input = readParticipantInput(formData);
  const error = validateParticipantInput(input, { requireContact: false });
  if (error) return { error };

  try {
    await db
      .update(participants)
      .set(toParticipantValues(input))
      .where(and(eq(participants.id, participantId), eq(participants.eventId, eventId)));
  } catch (err) {
    if (isUniqueViolation(err)) return { error: DUPLICATE_MESSAGE };
    throw err;
  }

  revalidateEvent(eventId);
  redirect(withToast(`/events/${eventId}/participants`, "success", "Participant updated."));
}

export async function deleteParticipant(eventId: number, participantId: number) {
  const session = await getSession();
  if (!session) redirect("/login");

  await db.delete(participants).where(and(eq(participants.id, participantId), eq(participants.eventId, eventId)));
  revalidateEvent(eventId);
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
  errors: ImportRowError[];
}

const INSERT_CHUNK_SIZE = 500;

/**
 * Imports participants from CSV (or tab-delimited) text. Columns are matched by
 * header name, not position, so column order doesn't matter. Rows matching an existing
 * participant (same name + contact number) are skipped and counted as duplicates,
 * so re-importing an updated sheet is safe.
 *
 * Contact numbers are kept as-is (minus spaces/dashes) rather than strictly validated,
 * since imported sheets often carry legacy formats.
 */
export async function importParticipantsCsv(eventId: number, csvText: string): Promise<ImportSummary> {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = parseCsv(csvText);
  if (rows.length === 0) return { imported: 0, duplicates: 0, errors: [{ row: 1, message: "The file is empty." }] };

  const columns = mapParticipantHeaders(rows[0]);
  if (columns.lastName === undefined || columns.firstName === undefined) {
    return {
      imported: 0,
      duplicates: 0,
      errors: [{ row: 1, message: 'Header row must include "Last Name" and "First Name" columns.' }],
    };
  }

  const cell = (cols: string[], key: keyof typeof columns) => {
    const index = columns[key];
    return index === undefined ? "" : (cols[index] ?? "").trim();
  };

  const errors: ImportRowError[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  const values: (typeof participants.$inferInsert)[] = [];
  const now = new Date();

  rows.slice(1).forEach((cols, i) => {
    const rowNum = i + 2; // header + 1-indexing
    const lastName = cell(cols, "lastName");
    const firstName = cell(cols, "firstName");
    const contactNumber = normalizeContactNumber(cell(cols, "contactNumber"));

    if (!lastName || !firstName) {
      errors.push({ row: rowNum, message: "Last name and first name are required." });
      return;
    }

    const rawDate = cell(cols, "registeredAt");
    const registeredAt = rawDate ? parseRegistrationDate(rawDate) : now;
    if (!registeredAt) {
      errors.push({ row: rowNum, message: `Couldn't read "${rawDate}" as a date of registration.` });
      return;
    }

    const key = `${lastName.toLowerCase()}|${firstName.toLowerCase()}|${contactNumber}`;
    if (seen.has(key)) {
      duplicates++;
      return;
    }
    seen.add(key);

    values.push({
      eventId,
      lastName,
      firstName,
      contactNumber,
      serviceAttended: cell(cols, "serviceAttended") || null,
      lifestage: cell(cols, "lifestage") || null,
      status: cell(cols, "status") || DEFAULT_STATUS,
      registeredAt,
      source: "csv",
    });
  });

  let imported = 0;
  for (let i = 0; i < values.length; i += INSERT_CHUNK_SIZE) {
    const chunk = values.slice(i, i + INSERT_CHUNK_SIZE);
    // Conflicts hit er_participants_event_person_uq — rows already in this event
    const inserted = await db
      .insert(participants)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: participants.id });
    imported += inserted.length;
    duplicates += chunk.length - inserted.length;
  }

  if (imported > 0) revalidateEvent(eventId);

  return { imported, duplicates, errors };
}
