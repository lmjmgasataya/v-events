import { getTableName } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { events, participants, users } from "@/db/schema";

export interface DevopsTable {
  /** pg table name, also the `?table=` key for /devops-admin/data/export */
  name: string;
  label: string;
  table: PgTable;
  /** Columns (schema property names) left out of the CSV export — secrets */
  omit: string[];
}

// `omit` is checked against the table's columns, so a renamed column fails to compile
// instead of silently leaking into the export.
function entry<T extends PgTable>(label: string, table: T, omit: (keyof T["_"]["columns"] & string)[] = []): DevopsTable {
  return { name: getTableName(table), label, table, omit };
}

/**
 * Every `er_*` table this app owns, grouped by area. Drives the Devops Admin Data page
 * (row counts + CSV export), its export route and the Overview's table sizes.
 * Add new `er_` tables here when they're added to the schema.
 */
export const DEVOPS_TABLE_GROUPS: { area: string; tables: DevopsTable[] }[] = [
  {
    area: "Events & registration",
    tables: [
      // publicSlug is the token behind the shareable /e/<slug> link
      entry("Events (no public link tokens)", events, ["publicSlug"]),
      entry("Participants & check-ins", participants),
    ],
  },
  {
    area: "Staff",
    tables: [entry("Staff users (no password hashes)", users, ["passwordHash"])],
  },
];

export const DEVOPS_TABLES: DevopsTable[] = DEVOPS_TABLE_GROUPS.flatMap((g) => g.tables);
