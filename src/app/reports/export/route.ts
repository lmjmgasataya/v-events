import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEventsSummary } from "@/lib/reports";
import { toCsv } from "@/lib/csv";
import { toManilaCsvDateTime } from "@/lib/date";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getEventsSummary();
  const csv = toCsv([
    ["Event", "Starts", "Venue", "Registered", "Public Link Registrations", "Walk-ins", "Checked In", "Attendance Rate"],
    ...rows.map((r) => [
      r.name,
      toManilaCsvDateTime(r.startsAt),
      r.venue,
      r.registered,
      r.publicRegistrations,
      r.walkIns,
      r.checkedIn,
      r.registered ? `${Math.round((r.checkedIn / r.registered) * 100)}%` : "0%",
    ]),
  ]);

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="events-summary.csv"',
    },
  });
}
