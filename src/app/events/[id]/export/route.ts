import { NextResponse, type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, participants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { toManilaCsvDateTime } from "@/lib/date";
import { SOURCE_LABELS } from "@/lib/constants";
import { formatAnswer, normalizeFormConfig } from "@/lib/form-config";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number((await params).id);
  const [event] = Number.isInteger(id) ? await db.select().from(events).where(eq(events.id, id)).limit(1) : [];
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, event.id))
    .orderBy(asc(participants.lastName), asc(participants.firstName));

  const { questions } = normalizeFormConfig(event.form);

  // First eight columns mirror the import format, and custom questions are matched by
  // title on import, so an export can be re-imported
  const csv = toCsv([
    [
      "Last Name",
      "First Name",
      "Contact Number",
      "Service Attended",
      "Lifestage",
      "Status(Registered)",
      "Date of Registration",
      "Nickname",
      "Source",
      "Checked In",
      "Checked In At",
      ...questions.map((q) => q.label),
    ],
    ...rows.map((p) => [
      p.lastName,
      p.firstName,
      p.contactNumber,
      p.serviceAttended,
      p.lifestage,
      p.status,
      toManilaCsvDateTime(p.registeredAt),
      p.nickname,
      SOURCE_LABELS[p.source] ?? p.source,
      p.checkedInAt ? "Yes" : "No",
      p.checkedInAt ? toManilaCsvDateTime(p.checkedInAt) : "",
      ...questions.map((q) => formatAnswer(p.answers[q.id])),
    ]),
  ]);

  const safeName = event.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-participants.csv"`,
    },
  });
}
