// Pure date helpers with no server-only imports, safe to use from Client Components.
// Asia/Manila is fixed UTC+8 with no DST, so conversions are a plain offset shift.

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const TZ = "Asia/Manila";

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-PH", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("en-PH", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

/** Date → "YYYY-MM-DDTHH:mm" in Manila time, for `<input type="datetime-local">` defaults. */
export function toManilaDateTimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 16);
}

/** Date → "YYYY-MM-DD HH:mm" in Manila time; unambiguous for CSV exports and re-import. */
export function toManilaCsvDateTime(date: Date | null | undefined): string {
  return toManilaDateTimeLocal(date).replace("T", " ");
}

/** "YYYY-MM-DDTHH:mm" (Manila wall time, from a datetime-local input) → Date. */
export function fromManilaDateTimeLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d, hh, mm] = match.map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - MANILA_OFFSET_MS);
}

/** Hour of day (0–23) in Manila time. */
export function manilaHour(date: Date): number {
  return new Date(date.getTime() + MANILA_OFFSET_MS).getUTCHours();
}

/**
 * Parses the "Date of Registration" column from an imported CSV. Spreadsheets export
 * dates in many shapes, so this accepts (all read as Manila wall time):
 *   2026-09-15, 2026-09-15 14:30, 2026-09-15T14:30:00
 *   9/15/2026, 09/15/2026 2:30 PM, 9/15/26
 *   anything else Date.parse understands (e.g. "September 15, 2026")
 * Returns null when the value can't be read as a date.
 */
export function parseRegistrationDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (iso) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = iso;
    return manilaWallTime(+y, +m, +d, +hh, +mm, +ss);
  }

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?)?$/.exec(value);
  if (mdy) {
    const [, m, d, yRaw, hRaw = "0", mm = "0", ss = "0", ampm] = mdy;
    const y = yRaw.length === 2 ? 2000 + +yRaw : +yRaw;
    let h = +hRaw;
    if (ampm) {
      const pm = ampm.toLowerCase() === "pm";
      if (h === 12) h = pm ? 12 : 0;
      else if (pm) h += 12;
    }
    return manilaWallTime(y, +m, +d, h, +mm, +ss);
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  // Date.parse reads zone-less strings as server-local time; re-anchor to Manila.
  const local = new Date(parsed);
  return manilaWallTime(
    local.getFullYear(),
    local.getMonth() + 1,
    local.getDate(),
    local.getHours(),
    local.getMinutes(),
    local.getSeconds()
  );
}

function manilaWallTime(y: number, m: number, d: number, hh: number, mm: number, ss: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59 || ss > 59) return null;
  const date = new Date(Date.UTC(y, m - 1, d, hh, mm, ss) - MANILA_OFFSET_MS);
  // Reject rollovers like 2/31 → 3/3
  const check = new Date(date.getTime() + MANILA_OFFSET_MS);
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return date;
}
