import { NextResponse, type NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, participants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { MANILA_OFFSET_MS, toManilaCsvDateTime } from "@/lib/date";
import writeXlsxFile, { type SheetData } from "write-excel-file/node";
import { SOURCE_LABELS } from "@/lib/constants";
import { formatAnswer, normalizeFormConfig } from "@/lib/form-config";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  // title on import, so an export (CSV or Excel) can be re-imported
  const header = [
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
  ];
  const DATE_COLUMNS = new Set([6, 10]);
  const data: (string | Date | null)[][] = rows.map((p) => [
    p.lastName,
    p.firstName,
    p.contactNumber,
    p.serviceAttended,
    p.lifestage,
    p.status,
    p.registeredAt,
    p.nickname,
    SOURCE_LABELS[p.source] ?? p.source,
    p.checkedInAt ? "Yes" : "No",
    p.checkedInAt,
    ...questions.map((q) => formatAnswer(p.answers[q.id])),
  ]);

  const safeName = event.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";

  if (req.nextUrl.searchParams.get("format") === "xlsx") {
    const sheet: SheetData = [
      header.map((value) => ({ value, fontWeight: "bold" as const })),
      ...data.map((row) =>
        row.map((value) => {
          if (value instanceof Date) return { value: toExcelManilaDate(value), format: EXCEL_DATE_FORMAT };
          if (!value) return null;
          // "@" = Text, so Excel keeps contact numbers' leading 0
          return { value, format: "@" };
        })
      ),
    ];
    const buffer = await writeXlsxFile(sheet, {
      sheet: "Participants",
      stickyRowsCount: 1,
      columns: header.map((_, i) => ({ width: DATE_COLUMNS.has(i) ? 18 : i === 2 ? 15 : 20 })),
    }).toBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}-participants.xlsx"`,
      },
    });
  }

  const csv = toCsv([header, ...data.map((row) => row.map((v) => (v instanceof Date ? toManilaCsvDateTime(v) : v)))]);
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-participants.csv"`,
    },
  });
}

const EXCEL_DATE_FORMAT = "yyyy-mm-dd hh:mm";

/** Excel dates have no time zone: write the Manila wall time (read back as such by import). */
function toExcelManilaDate(date: Date): Date {
  return new Date(date.getTime() + MANILA_OFFSET_MS);
}
