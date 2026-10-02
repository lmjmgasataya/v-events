import { asc, count, desc, eq, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import { events, participants } from "@/db/schema";
import { isChoiceType, type FormQuestion } from "@/lib/form-config";

export interface BreakdownRow {
  label: string;
  registered: number;
  checkedIn: number;
}

const checkedInCount = sql<number>`count(${participants.checkedInAt})`.mapWith(Number);

async function breakdownBy(eventId: number, column: AnyColumn): Promise<BreakdownRow[]> {
  const label = sql<string>`coalesce(nullif(${column}, ''), 'Not specified')`;
  return db
    .select({ label, registered: count(), checkedIn: checkedInCount })
    .from(participants)
    .where(eq(participants.eventId, eventId))
    .groupBy(label)
    .orderBy(desc(count()), asc(label));
}

export async function getEventReport(eventId: number) {
  const manilaHour = sql<number>`extract(hour from ${participants.checkedInAt} at time zone 'Asia/Manila')`.mapWith(Number);
  const manilaDay = sql<string>`to_char(${participants.registeredAt} at time zone 'Asia/Manila', 'YYYY-MM-DD')`;

  const [byService, byLifestage, byStatus, bySource, checkInsByHour, registrationsByDay] = await Promise.all([
    breakdownBy(eventId, participants.serviceAttended),
    breakdownBy(eventId, participants.lifestage),
    breakdownBy(eventId, participants.status),
    breakdownBy(eventId, participants.source),
    db
      .select({ hour: manilaHour, n: count() })
      .from(participants)
      .where(sql`${participants.eventId} = ${eventId} and ${participants.checkedInAt} is not null`)
      .groupBy(manilaHour)
      .orderBy(manilaHour),
    db
      .select({ day: manilaDay, n: count() })
      .from(participants)
      .where(eq(participants.eventId, eventId))
      .groupBy(manilaDay)
      .orderBy(manilaDay),
  ]);

  return { byService, byLifestage, byStatus, bySource, checkInsByHour, registrationsByDay };
}

const NOT_SPECIFIED = "Not specified";

/**
 * Breakdown per choice question (multiple choice / checkboxes / dropdown), listed in
 * option order. For checkboxes one person can count toward several options.
 */
export async function getQuestionBreakdowns(eventId: number, questions: FormQuestion[]) {
  const choiceQuestions = questions.filter((q) => isChoiceType(q.type));
  if (choiceQuestions.length === 0) return [];

  const rows = await db
    .select({ answers: participants.answers, checkedInAt: participants.checkedInAt })
    .from(participants)
    .where(eq(participants.eventId, eventId));

  return choiceQuestions.map((question) => {
    const tally = new Map<string, BreakdownRow>(
      question.options.map((label) => [label, { label, registered: 0, checkedIn: 0 }])
    );
    for (const row of rows) {
      const value = row.answers[question.id];
      const labels = value === undefined || value.length === 0 ? [NOT_SPECIFIED] : Array.isArray(value) ? value : [value];
      for (const label of labels) {
        const entry = tally.get(label) ?? { label, registered: 0, checkedIn: 0 };
        entry.registered++;
        if (row.checkedInAt) entry.checkedIn++;
        tally.set(label, entry);
      }
    }
    // Options nobody picked stay listed (as 0), like a Google Forms summary; "Not specified" goes last
    const breakdown = [...tally.values()].sort(
      (a, b) => Number(a.label === NOT_SPECIFIED) - Number(b.label === NOT_SPECIFIED)
    );
    return { question, rows: rows.length === 0 ? [] : breakdown };
  });
}

/** One row per event with registered / checked-in / walk-in totals, newest first. */
export async function getEventsSummary() {
  return db
    .select({
      id: events.id,
      name: events.name,
      startsAt: events.startsAt,
      venue: events.venue,
      registered: sql<number>`count(${participants.id})`.mapWith(Number),
      checkedIn: checkedInCount,
      walkIns: sql<number>`count(*) filter (where ${participants.source} = 'walk_in')`.mapWith(Number),
      publicRegistrations: sql<number>`count(*) filter (where ${participants.source} = 'public')`.mapWith(Number),
    })
    .from(events)
    .leftJoin(participants, eq(participants.eventId, events.id))
    .groupBy(events.id)
    .orderBy(desc(events.startsAt));
}
