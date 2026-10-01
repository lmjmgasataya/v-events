// Pure CSV helpers with no server-only imports, safe to use from Client Components.

export const PARTICIPANT_IMPORT_HEADERS = [
  "Last Name",
  "First Name",
  "Contact Number",
  "Service Attended",
  "Lifestage",
  "Status(Registered)",
  "Date of Registration",
] as const;

const TEMPLATE_EXAMPLE_ROW = [
  "Dela Cruz",
  "Juan",
  "09171234567",
  "9AM - Mandurriao",
  "Single",
  "Registered",
  "2026-09-15",
];

export type ParticipantColumn =
  | "lastName"
  | "firstName"
  | "contactNumber"
  | "serviceAttended"
  | "lifestage"
  | "status"
  | "registeredAt";

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
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z]/g, "");
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

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map((v) => escapeCsvField(v == null ? "" : String(v))).join(",")).join("\r\n");
}

export function buildParticipantImportTemplate(): string {
  return toCsv([[...PARTICIPANT_IMPORT_HEADERS], TEMPLATE_EXAMPLE_ROW]);
}

/** Excel copy-pastes and "Text (Tab delimited)" saves use tabs; sniff the header line. */
function detectDelimiter(text: string): "," | "\t" {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const tabs = firstLine.split("\t").length;
  const commas = firstLine.split(",").length;
  return tabs > commas ? "\t" : ",";
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
