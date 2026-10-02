import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getBaseUrl, getEventOrNotFound, publicEventPath } from "@/lib/events";
import { normalizeFormConfig } from "@/lib/form-config";
import { FormBuilder } from "./FormBuilder";

export default async function EventFormPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const event = await getEventOrNotFound((await params).id);

  // How many people answered each question, so deleting one can warn first
  const { rows: counts } = await db.execute<{ key: string; n: number }>(sql`
    select k as key, count(*)::int as n
    from ${participants}, jsonb_object_keys(${participants.answers}) as k
    where ${participants.eventId} = ${event.id}
    group by k
  `);

  return (
    <FormBuilder
      eventId={event.id}
      initialConfig={normalizeFormConfig(event.form)}
      answerCounts={Object.fromEntries(counts.map((c) => [c.key, c.n]))}
      publicUrl={`${await getBaseUrl()}${publicEventPath(event.publicSlug)}`}
    />
  );
}
