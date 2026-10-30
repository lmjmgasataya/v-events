import { sql } from "drizzle-orm";
import { db } from "@/db";
import { DEVOPS_TABLES, DEVOPS_TABLE_GROUPS } from "@/lib/devopsTables";
import { requireAdmin } from "../requireAdmin";

// One round trip for every table's row count (UNION ALL) instead of a query per table
async function getCounts(): Promise<Record<string, number>> {
  const result = await db.execute<{ name: string; c: number }>(
    sql.join(
      DEVOPS_TABLES.map((t) => sql`SELECT ${t.name} AS name, count(*)::int AS c FROM ${t.table}`),
      sql` UNION ALL `
    )
  );
  return Object.fromEntries(result.rows.map((r) => [r.name, r.c]));
}

export default async function DevopsDataPage() {
  await requireAdmin();
  const counts = await getCounts();

  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Export CSV</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          A full dump of each table, current at the time of download. Dates are UTC (ISO 8601). Password hashes and
          public link tokens are left out.
        </p>
      </div>
      {DEVOPS_TABLE_GROUPS.map(({ area, tables }) => (
        <div key={area}>
          <p className="px-4 py-2 bg-gray-50/60 border-y border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {area}
          </p>
          <ul className="divide-y divide-gray-100">
            {tables.map(({ name, label }) => (
              <li key={name} className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-mono">{name}</span> · {(counts[name] ?? 0).toLocaleString()} rows
                  </p>
                </div>
                <a
                  href={`/devops-admin/data/export?table=${name}`}
                  download
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Download CSV
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
