import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEventsSummary } from "@/lib/reports";
import { formatDate } from "@/lib/date";
import { StatCard, percent } from "@/components/StatCard";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rows = await getEventsSummary();
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
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Registered</th>
              <th className="px-4 py-3 font-medium text-right">Public link</th>
              <th className="px-4 py-3 font-medium text-right">Walk-ins</th>
              <th className="px-4 py-3 font-medium text-right">Checked in</th>
              <th className="px-4 py-3 font-medium text-right">Rate</th>
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
