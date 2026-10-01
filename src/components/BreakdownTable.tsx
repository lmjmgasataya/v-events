import type { BreakdownRow } from "@/lib/reports";
import { percent } from "@/components/StatCard";

export function BreakdownTable({
  title,
  rows,
  labelFor = (l) => l,
}: {
  title: string;
  rows: BreakdownRow[];
  labelFor?: (label: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.registered));

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 break-inside-avoid">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No data yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="pb-2 font-medium" />
              <th className="pb-2 font-medium text-right">Reg.</th>
              <th className="pb-2 font-medium text-right">In</th>
              <th className="pb-2 font-medium text-right">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-1.5 pr-3">
                  <p className="text-gray-800">{labelFor(r.label)}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-er-navy/25 relative" style={{ width: `${(r.registered / max) * 100}%` }}>
                      <div
                        className="absolute inset-y-0 left-0 bg-er-green"
                        style={{ width: r.registered ? `${(r.checkedIn / r.registered) * 100}%` : 0 }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-1.5 text-right tabular-nums text-gray-700">{r.registered}</td>
                <td className="py-1.5 text-right tabular-nums text-gray-700">{r.checkedIn}</td>
                <td className="py-1.5 text-right tabular-nums text-gray-500">{percent(r.checkedIn, r.registered)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
