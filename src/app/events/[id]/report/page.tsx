import { getEventCounts, getEventOrNotFound } from "@/lib/events";
import { getEventReport } from "@/lib/reports";
import { SOURCE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/date";
import { StatCard, percent } from "@/components/StatCard";
import { BreakdownTable } from "@/components/BreakdownTable";
import { PrintButton } from "@/components/PrintButton";

function hourLabel(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

export default async function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  const event = await getEventOrNotFound((await params).id);
  const [countsMap, report] = await Promise.all([getEventCounts(event.id), getEventReport(event.id)]);
  const counts = countsMap.get(event.id) ?? { registered: 0, checkedIn: 0 };
  const walkIns = report.bySource.find((r) => r.label === "walk_in")?.registered ?? 0;
  const maxHour = Math.max(1, ...report.checkInsByHour.map((r) => r.n));
  const maxDay = Math.max(1, ...report.registrationsByDay.map((r) => r.n));

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden flex justify-end gap-2">
        <a
          href={`/events/${event.id}/export?type=participants`}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          Export participants CSV
        </a>
        <PrintButton />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered" value={counts.registered} />
        <StatCard label="Checked in" value={counts.checkedIn} />
        <StatCard label="Attendance rate" value={percent(counts.checkedIn, counts.registered)} />
        <StatCard label="No-shows" value={counts.registered - counts.checkedIn} hint={`${walkIns} walk-in(s) included above`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownTable title="By service attended" rows={report.byService} />
        <BreakdownTable title="By lifestage" rows={report.byLifestage} />
        <BreakdownTable title="By status" rows={report.byStatus} />
        <BreakdownTable title="By registration source" rows={report.bySource} labelFor={(l) => SOURCE_LABELS[l] ?? l} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="bg-white rounded-xl border border-gray-200 p-5 break-inside-avoid">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Check-ins by hour</h2>
          {report.checkInsByHour.length === 0 ? (
            <p className="text-sm text-gray-400">No check-ins yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {report.checkInsByHour.map((r) => (
                <li key={r.hour} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 text-gray-500 tabular-nums">{hourLabel(r.hour)}</span>
                  <div className="flex-1 h-4 rounded bg-gray-100 overflow-hidden">
                    <div className="h-full bg-er-green" style={{ width: `${(r.n / maxHour) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right tabular-nums text-gray-700">{r.n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 break-inside-avoid">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Registrations by date</h2>
          {report.registrationsByDay.length === 0 ? (
            <p className="text-sm text-gray-400">No registrations yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
              {report.registrationsByDay.map((r) => (
                <li key={r.day} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-gray-500 tabular-nums">{formatDate(`${r.day}T00:00:00+08:00`)}</span>
                  <div className="flex-1 h-4 rounded bg-gray-100 overflow-hidden">
                    <div className="h-full bg-er-navy/70" style={{ width: `${(r.n / maxDay) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right tabular-nums text-gray-700">{r.n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
