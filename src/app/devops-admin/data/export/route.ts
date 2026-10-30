import { NextResponse, type NextRequest } from "next/server";
import { getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { DEVOPS_TABLES } from "@/lib/devopsTables";

// Generic raw dump of one registry table (?table=<pg name>), admin only. Unlike the
// participants export it isn't meant for re-import: headers are schema property names
// and dates are ISO UTC so nothing is lost.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entry = DEVOPS_TABLES.find((t) => t.name === req.nextUrl.searchParams.get("table"));
  if (!entry) return NextResponse.json({ error: "Unknown table" }, { status: 400 });

  // Secret columns (see `omit` in the registry) are never selected
  const columns = Object.fromEntries(
    Object.entries(getTableColumns(entry.table)).filter(([key]) => !entry.omit.includes(key))
  );
  const header = Object.keys(columns);
  const rows = (await db.select(columns).from(entry.table)) as Record<string, unknown>[];

  const csv = toCsv([header, ...rows.map((row) => header.map((key) => csvValue(row[key])))]);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${entry.name}_${date}.csv"`,
    },
  });
}

function csvValue(value: unknown): string | number | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value); // jsonb (form config, answers)
  if (typeof value === "boolean") return String(value);
  return value as string | number;
}
