// Pure CSV helpers with no server-only imports, safe to use from Client Components.

export const PARTICIPANT_IMPORT_HEADERS = [
  "Last Name",
  "First Name",
  "Contact Number",
  "Service Attended",
  "Lifestage",
  "Status(Registered)",
  "Date of Registration",
  "Nickname",
] as const;

const TEMPLATE_EXAMPLE_ROW = [
  "Dela Cruz",
  "Juan",
  "09171234567",
  "9AM - Mandurriao",
  "Single",
  "Registered",
  "2026-09-15",
  "Jun",
];

export type ParticipantColumn =
  | "lastName"
  | "firstName"
  | "contactNumber"
  | "serviceAttended"
  | "lifestage"
  | "status"
  | "registeredAt"
  | "nickname"
  | "fullName"; // split into first/last name when there are no separate name columns

// Headers are matched after lowercasing and stripping everything but letters, so
// "Last Name", "last_name", "LASTNAME" and "Status(Registered)" all resolve.
const HEADER_ALIASES: Record<string, ParticipantColumn> = {
  lastname: "lastName",
  surname: "lastName",
  firstname: "firstName",
  givenname: "firstName",
  contactnumber: "contactNumber",
  contact: "contactNumber",
  mobilenumber: "contactNumber",
  phonenumber: "contactNumber",
  serviceattended: "serviceAttended",
  service: "serviceAttended",
  lifestage: "lifestage",
  status: "status",
  statusregistered: "status",
  dateofregistration: "registeredAt",
  registrationdate: "registeredAt",
  dateregistered: "registeredAt",
  nickname: "nickname",
  preferredname: "nickname",
  name: "fullName",
  fullname: "fullName",
  completename: "fullName",
  participant: "fullName",
  participantname: "fullName",
};

export const PARTICIPANT_COLUMN_LABELS: Record<ParticipantColumn, string> = {
  lastName: "Last name",
  firstName: "First name",
  fullName: "Full name (split into first + last)",
  nickname: "Nickname",
  contactNumber: "Contact number",
  serviceAttended: "Service attended",
  lifestage: "Lifestage",
  status: "Status",
  registeredAt: "Date of registration",
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Maps the event's custom form questions to header indexes by question title
 * (case/punctuation-insensitive). Built-in columns win if a title collides with one.
 */
export function mapQuestionHeaders<Q extends { id: string; label: string }>(
  headerRow: string[],
  questions: Q[]
): { question: Q; index: number }[] {
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const byKey = new Map(questions.map((q) => [key(q.label), q]));
  const mapped = new Map<string, { question: Q; index: number }>();
  headerRow.forEach((header, index) => {
    if (HEADER_ALIASES[normalizeHeader(header)]) return;
    const question = byKey.get(key(header));
    if (question && !mapped.has(question.id)) mapped.set(question.id, { question, index });
  });
  return [...mapped.values()];
}

/** Maps each known column to its index in the header row; unknown headers are ignored. */
export function mapParticipantHeaders(headerRow: string[]): Partial<Record<ParticipantColumn, number>> {
  const map: Partial<Record<ParticipantColumn, number>> = {};
  headerRow.forEach((header, index) => {
    const column = HEADER_ALIASES[normalizeHeader(header)];
    if (column && map[column] === undefined) map[column] = index;
  });
  return map;
}

/**
 * What each file column is imported as: a participant column, `q:<questionId>` for a
 * form question, or null to ignore it. Chosen on the import preview (auto-filled from
 * the header row by autoMapColumns) and sent with the rows to the import action.
 */
export type ImportField = ParticipantColumn | `q:${string}`;

export interface ImportMapping {
  /** Index of the header row in the file (rows above it are skipped), or null when every row is data. */
  headerRow: number | null;
  columns: (ImportField | null)[];
}

const HEADER_SCAN_ROWS = 10;

/** Data rows per import (not counting the header and anything above it). */
export const MAX_IMPORT_ROWS = 5000;

function nameColumnsFound(map: Partial<Record<ParticipantColumn, number>>) {
  return (map.lastName !== undefined && map.firstName !== undefined) || map.fullName !== undefined;
}

/**
 * Finds the header row among the first few rows (sheets often have a title or blank
 * rows above it): the first row naming the name column(s), else the row matching the
 * most known headers, else null (no header — every row is data).
 */
export function detectHeaderRow(rows: string[][]): number | null {
  let best: { index: number; matches: number } | null = null;
  for (const [index, row] of rows.slice(0, HEADER_SCAN_ROWS).entries()) {
    const map = mapParticipantHeaders(row);
    if (nameColumnsFound(map)) return index;
    const matches = Object.keys(map).length;
    if (matches > 0 && (!best || matches > best.matches)) best = { index, matches };
  }
  return best?.index ?? null;
}

/** Fills in the column mapping from the header row (unrecognized headers are ignored). */
export function autoMapColumns(
  rows: string[][],
  headerRow: number | null,
  questions: { id: string; label: string }[]
): (ImportField | null)[] {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const columns: (ImportField | null)[] = Array(width).fill(null);
  if (headerRow === null) {
    // No headers: a plain list of names, one per line
    if (width === 1) columns[0] = "fullName";
    return columns;
  }
  const header = rows[headerRow] ?? [];
  const map = mapParticipantHeaders(header);
  // Separate name columns win over a full-name column
  if (map.lastName !== undefined && map.firstName !== undefined) delete map.fullName;
  for (const [column, index] of Object.entries(map)) columns[index] = column as ParticipantColumn;
  for (const { question, index } of mapQuestionHeaders(header, questions)) columns[index] = `q:${question.id}`;
  return columns;
}

// Surname particles kept with the last name: "Juan Dela Cruz", "Ana de los Santos"
const SURNAME_PARTICLES = new Set([
  "de", "del", "dela", "della", "delos", "la", "las", "los", "san", "sta", "sta.", "sto", "sto.", "santa", "santo", "van", "von", "da", "di", "du",
]);

/** "Dela Cruz, Juan" or "Juan Dela Cruz" → first/last. A single word comes back as a first name only. */
export function splitFullName(raw: string): { firstName: string; lastName: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  const comma = name.indexOf(",");
  if (comma !== -1) return { lastName: name.slice(0, comma).trim(), firstName: name.slice(comma + 1).trim() };
  const words = name.split(" ");
  if (words.length < 2) return { firstName: name, lastName: "" };
  let start = words.length - 1;
  while (start > 1 && SURNAME_PARTICLES.has(words[start - 1].toLowerCase())) start--;
  return { firstName: words.slice(0, start).join(" "), lastName: words.slice(start).join(" ") };
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map((v) => escapeCsvField(v == null ? "" : String(v))).join(",")).join("\r\n");
}

export function buildParticipantImportTemplate(questionLabels: string[] = []): string {
  return toCsv([
    [...PARTICIPANT_IMPORT_HEADERS, ...questionLabels],
    [...TEMPLATE_EXAMPLE_ROW, ...questionLabels.map(() => "")],
  ]);
}

/**
 * .csv/.txt can be comma- or tab-delimited (Excel copy-pastes and "Text (Tab delimited)"
 * saves use tabs). Sniffs the first few lines, not just the first, since a title line
 * above the header often has neither: the delimiter found on more lines wins.
 */
function detectDelimiter(text: string): "," | "\t" {
  const lines = text.split(/\r?\n/, HEADER_SCAN_ROWS);
  const score = (d: string) => [lines.filter((l) => l.includes(d)).length, lines.join("").split(d).length];
  const [tabLines, tabs] = score("\t");
  const [commaLines, commas] = score(",");
  return tabLines > commaLines || (tabLines === commaLines && tabs > commas) ? "\t" : ",";
}

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, ""); // strip Excel's UTF-8 BOM
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !r.every((cell) => cell.trim() === ""));
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
