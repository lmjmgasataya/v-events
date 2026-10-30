import { sql } from "drizzle-orm";
import { db } from "@/db";
import { DEVOPS_TABLE_GROUPS } from "@/lib/devopsTables";
import { StatCard } from "@/components/StatCard";
import { requireAdmin } from "./requireAdmin";

// pg table name → area, for grouping the size list
const AREA_BY_TABLE = new Map(DEVOPS_TABLE_GROUPS.flatMap(({ area, tables }) => tables.map((t) => [t.name, area] as const)));

const UNREGISTERED = "Not in the registry (add to src/lib/devopsTables.ts)";

// The database is shared with v-1 and other apps, so only `er_*` tables are listed.
async function getDbStats() {
  const [tables, totals] = await Promise.all([
    db.execute<{ name: string; size: string }>(sql`
      SELECT relname AS name, pg_size_pretty(pg_total_relation_size(relid)) AS size
      FROM pg_catalog.pg_statio_user_tables
      WHERE schemaname = 'public' AND starts_with(relname, 'er_')
      ORDER BY pg_total_relation_size(relid) DESC
    `),
    db.execute<{ app_size: string; db_size: string }>(sql`
      SELECT pg_size_pretty(coalesce(sum(pg_total_relation_size(relid)), 0)) AS app_size,
             pg_size_pretty(pg_database_size(current_database())) AS db_size
      FROM pg_catalog.pg_statio_user_tables
      WHERE schemaname = 'public' AND starts_with(relname, 'er_')
    `),
  ]);
  return { tables: tables.rows, ...totals.rows[0] };
}

export default async function DevopsOverviewPage() {
  await requireAdmin();
  const { tables, app_size, db_size } = await getDbStats();

  const groups = [...DEVOPS_TABLE_GROUPS.map((g) => g.area), UNREGISTERED]
    .map((area) => ({ area, rows: tables.filter((t) => (AREA_BY_TABLE.get(t.name) ?? UNREGISTERED) === area) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="This app's tables" value={app_size} hint={`${tables.length} er_* tables, incl. indexes`} />
        <StatCard label="Whole database" value={db_size} hint="Shared with v-1 and other apps" />
      </div>

      <section className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Database</h2>
          <p className="text-xs text-gray-500 mt-0.5">Size of each table, including its indexes.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Table</th>
              <th className="px-4 py-2 font-medium text-right">Size</th>
            </tr>
          </thead>
          {groups.map(({ area, rows }) => (
            <tbody key={area} className="divide-y divide-gray-100">
              <tr>
                <td colSpan={2} className="px-4 py-2 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {area}
                </td>
              </tr>
              {rows.map((t) => (
                <tr key={t.name} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-mono text-gray-700">{t.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{t.size}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </section>
    </div>
  );
}
