"use server";

import { db } from "@/db";
import { participants } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { MAX_IMPORT_ROWS, PARTICIPANT_COLUMN_LABELS, splitFullName, type ImportMapping } from "@/lib/csv";
import { parseRegistrationDate } from "@/lib/date";
import { isUniqueViolation } from "@/lib/db-errors";
import { getEventForm } from "@/lib/events";
import { parseAnswerText, type Answers } from "@/lib/form-config";
import {
  normalizeContactNumber,
  readParticipantInput,
  toParticipantValues,
  validateParticipantInput,
} from "@/lib/participants";
import { DEFAULT_STATUS } from "@/lib/constants";
import { normalizeService } from "@/lib/services";
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

  const form = await getEventForm(eventId);
  const input = readParticipantInput(formData, form);
  const error = validateParticipantInput(input, form, { strict: false });
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

  const form = await getEventForm(eventId);
  const input = readParticipantInput(formData, form);
  const error = validateParticipantInput(input, form, { strict: false });
  if (error) return { error };

  // Replace answers to the form's current questions (a cleared answer is removed);
  // answers to questions since removed from the form are kept.
  const currentIds = form.questions.map((q) => q.id);
  const answers = sql`(${participants.answers} - ${sql`array[${sql.join(
    currentIds.map((qid) => sql`${qid}`),
    sql`, `
  )}]::text[]`}) || ${JSON.stringify(input.answers)}::jsonb`;

  try {
    await db
      .update(participants)
      .set({ ...toParticipantValues(input), answers })
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

export type ImportRowStatus = "new" | "duplicate" | "error";

export interface ImportPreviewRow {
  /** Row number in the file (1-based, as a spreadsheet shows it). */
  row: number;
  status: ImportRowStatus;
  firstName: string;
  lastName: string;
  nickname: string;
  contactNumber: string;
  /** Why the row will be skipped (errors and duplicates). */
  message?: string;
}

export interface ImportPreview {
  rows: ImportPreviewRow[];
  counts: Record<ImportRowStatus, number>;
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
  errors: number;
}

const INSERT_CHUNK_SIZE = 500;
const IMPORT_FIELDS = new Set<string>(Object.keys(PARTICIPANT_COLUMN_LABELS));

const personKey = (lastName: string, firstName: string, contactNumber: string) =>
  `${lastName.toLowerCase()}|${firstName.toLowerCase()}|${contactNumber}`;

/**
 * Turns the uploaded rows (parsed in the browser from CSV, tab-delimited text or .xlsx)
 * into participant values using the column mapping confirmed on the preview, so column
 * order and header wording don't matter. Repeats within the file are marked duplicates;
 * rows already in the event are left to the unique index (see importParticipants).
 *
 * Contact numbers are kept as-is (minus spaces/dashes) rather than strictly validated,
 * since imported sheets often carry legacy formats. Form question columns fill in that
 * question's answer (checkboxes: "; "-separated).
 */
async function buildImportRows(eventId: number, rawRows: unknown, rawMapping: unknown) {
  const mapping = (rawMapping && typeof rawMapping === "object" ? rawMapping : {}) as Partial<ImportMapping>;
  const headerRow = Number.isInteger(mapping.headerRow) && mapping.headerRow! >= 0 ? mapping.headerRow! : null;
  // The import modal refuses bigger files; this just bounds the work
  const rows = (Array.isArray(rawRows) ? rawRows : [])
    .slice(0, (headerRow ?? -1) + 1 + MAX_IMPORT_ROWS)
    .map((r) => (Array.isArray(r) ? r.map((c) => (typeof c === "string" ? c : String(c ?? ""))) : []));

  const questions = new Map((await getEventForm(eventId)).questions.map((q) => [q.id, q]));
  const columns = new Map<string, number>();
  (Array.isArray(mapping.columns) ? mapping.columns : []).forEach((field, index) => {
    if (typeof field !== "string" || columns.has(field)) return;
    if (IMPORT_FIELDS.has(field) || (field.startsWith("q:") && questions.has(field.slice(2)))) columns.set(field, index);
  });

  const preview: ImportPreviewRow[] = [];
  const values: (typeof participants.$inferInsert)[] = [];
  const valueRows: ImportPreviewRow[] = []; // preview row for each entry in values
  const seen = new Set<string>();
  const now = new Date();
  const hasNameColumns = (columns.has("lastName") && columns.has("firstName")) || columns.has("fullName");

  rows.forEach((cols, i) => {
    if (headerRow !== null && i <= headerRow) return;
    const cell = (field: string) => {
      const index = columns.get(field);
      return index === undefined ? "" : (cols[index] ?? "").trim();
    };

    let lastName = cell("lastName");
    let firstName = cell("firstName");
    if (columns.has("fullName") && (!lastName || !firstName)) {
      const split = splitFullName(cell("fullName"));
      lastName ||= split.lastName;
      firstName ||= split.firstName;
    }
    const nickname = cell("nickname").slice(0, 40);
    const contactNumber = normalizeContactNumber(cell("contactNumber"));
    const row: ImportPreviewRow = { row: i + 1, status: "new", firstName, lastName, nickname, contactNumber };
    preview.push(row);

    const fail = (message: string) => Object.assign(row, { status: "error", message });
    if (!hasNameColumns) return fail("Pick which column has the last and first name (or full name).");
    if (!lastName || !firstName) return fail("Last name and first name are required.");

    const rawDate = cell("registeredAt");
    const registeredAt = rawDate ? parseRegistrationDate(rawDate) : now;
    if (!registeredAt) return fail(`Couldn't read "${rawDate}" as a date of registration.`);

    const key = personKey(lastName, firstName, contactNumber);
    if (seen.has(key)) return Object.assign(row, { status: "duplicate", message: "Repeated in this file." });
    seen.add(key);

    const answers: Answers = {};
    for (const [field, index] of columns) {
      const question = field.startsWith("q:") ? questions.get(field.slice(2)) : undefined;
      if (!question) continue;
      const answer = parseAnswerText(question.type, cols[index] ?? "");
      if (answer !== undefined) answers[question.id] = answer;
    }

    values.push({
      eventId,
      lastName,
      firstName,
      nickname,
      contactNumber,
      serviceAttended: normalizeService(cell("serviceAttended")),
      lifestage: cell("lifestage") || null,
      status: cell("status") || DEFAULT_STATUS,
      registeredAt,
      answers,
      source: "csv",
    });
    valueRows.push(row);
  });

  return { preview, values, valueRows };
}

function countStatuses(rows: ImportPreviewRow[]): Record<ImportRowStatus, number> {
  const counts = { new: 0, duplicate: 0, error: 0 };
  for (const r of rows) counts[r.status]++;
  return counts;
}

/** Dry run for the import confirmation step: what each row will do, without saving anything. */
export async function previewParticipantImport(eventId: number, rows: string[][], mapping: ImportMapping): Promise<ImportPreview> {
  const session = await getSession();
  if (!session) redirect("/login");

  const { preview, valueRows } = await buildImportRows(eventId, rows, mapping);

  // Same rule as er_participants_event_person_uq
  const existing = await db
    .select({ lastName: participants.lastName, firstName: participants.firstName, contactNumber: participants.contactNumber })
    .from(participants)
    .where(eq(participants.eventId, eventId));
  const existingKeys = new Set(existing.map((p) => personKey(p.lastName, p.firstName, p.contactNumber)));
  for (const row of valueRows) {
    if (existingKeys.has(personKey(row.lastName, row.firstName, row.contactNumber))) {
      Object.assign(row, { status: "duplicate", message: "Already in this event." });
    }
  }

  return { rows: preview, counts: countStatuses(preview) };
}

/**
 * Imports the rows confirmed on the preview. Rows matching an existing participant
 * (same name + contact number) are skipped and counted as duplicates, so re-importing
 * an updated sheet is safe.
 */
export async function importParticipants(eventId: number, rows: string[][], mapping: ImportMapping): Promise<ImportSummary> {
  const session = await getSession();
  if (!session) redirect("/login");

  const { preview, values } = await buildImportRows(eventId, rows, mapping);
  const counts = countStatuses(preview);

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
  }

  if (imported > 0) revalidateEvent(eventId);

  return { imported, duplicates: counts.duplicate + (values.length - imported), errors: counts.error };
}
