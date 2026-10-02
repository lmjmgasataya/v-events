import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, participants } from "@/db/schema";
import { normalizeFormConfig } from "@/lib/form-config";

export async function getEventOrNotFound(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) notFound();
  return event;
}

/** The event's registration form, for server actions that only have the event id. */
export async function getEventForm(eventId: number) {
  const [event] = await db.select({ form: events.form }).from(events).where(eq(events.id, eventId)).limit(1);
  return normalizeFormConfig(event?.form);
}

/** Registered / checked-in counts per event, keyed by event id. */
export async function getEventCounts(eventId?: number) {
  const rows = await db
    .select({
      eventId: participants.eventId,
      registered: count(),
      checkedIn: sql<number>`count(${participants.checkedInAt})`.mapWith(Number),
    })
    .from(participants)
    .where(eventId ? eq(participants.eventId, eventId) : undefined)
    .groupBy(participants.eventId);
  return new Map(rows.map((r) => [r.eventId, { registered: r.registered, checkedIn: r.checkedIn }]));
}

/** Absolute origin of the current request, for building shareable public links. */
export async function getBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function publicEventPath(slug: string) {
  return `/e/${slug}`;
}
