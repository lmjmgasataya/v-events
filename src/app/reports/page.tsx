import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEventsSummary } from "@/lib/reports";
import { formatDate } from "@/lib/date";
import { StatCard, percent } from "@/components/StatCard";
import { SortableTh } from "@/components/SortableTh";
import { parseSort } from "@/lib/sort";

const SORT_COLUMNS = ["name", "startsAt", "registered", "publicRegistrations", "walkIns", "checkedIn", "rate"] as const;
type SortColumn = (typeof SORT_COLUMNS)[number];

const HEADERS: [SortColumn, string, "left" | "right"][] = [
  ["name", "Event", "left"],
  ["startsAt", "Date", "left"],
  ["registered", "Registered", "right"],
  ["publicRegistrations", "Public link", "right"],
  ["walkIns", "Walk-ins", "right"],
  ["checkedIn", "Checked in", "right"],
  ["rate", "Rate", "right"],
];

type SummaryRow = Awaited<ReturnType<typeof getEventsSummary>>[number];

function sortValue(row: SummaryRow, column: SortColumn): string | number {
  if (column === "rate") return row.registered ? row.checkedIn / row.registered : 0;
  if (column === "startsAt") return row.startsAt.getTime();
  if (column === "name") return row.name.toLowerCase();
  return row[column];
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { sort: sortParam, dir: dirParam } = await searchParams;
  // Default: newest event first
  const { sort, dir } = sortParam
    ? parseSort(sortParam, dirParam, SORT_COLUMNS, "startsAt")
    : { sort: "startsAt" as const, dir: "desc" as const };

  const rows = (await getEventsSummary()).sort((a, b) => {
    const av = sortValue(a, sort);
    const bv = sortValue(b, sort);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });
  const totals = rows.reduce(
    (acc, r) => ({
      registered: acc.registered + r.registered,
      checkedIn: acc.checkedIn + r.checkedIn,
      walkIns: acc.walkIns + r.walkIns,
    }),
    { registered: 0, checkedIn: 0, walkIns: 0 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-er-navy">Reports</h1>
        <a
          href="/reports/export"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          Export CSV
        </a>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Events" value={rows.length} />
        <StatCard label="Total registered" value={totals.registered} />
        <StatCard label="Total checked in" value={totals.checkedIn} />
        <StatCard label="Overall attendance" value={percent(totals.checkedIn, totals.registered)} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {HEADERS.map(([column, label, align]) => (
                <SortableTh key={column} column={column} label={label} sort={sort} dir={dir} align={align} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No events yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-2.5">
                  <Link href={`/events/${r.id}/report`} className="font-medium text-er-navy hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(r.startsAt)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.registered}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.publicRegistrations}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{r.walkIns}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.checkedIn}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{percent(r.checkedIn, r.registered)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
