"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { fromManilaDateTimeLocal } from "@/lib/date";
import { generatePublicSlug } from "@/lib/slug";
import { withToast } from "@/lib/toast";

export type EventFormState = { error?: string } | undefined;

function readEventInput(formData: FormData) {
  const name = ((formData.get("name") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const venue = ((formData.get("venue") as string) ?? "").trim();
  const startsAt = fromManilaDateTimeLocal((formData.get("startsAt") as string) ?? "");
  const endsAtRaw = (formData.get("endsAt") as string) ?? "";
  const endsAt = endsAtRaw ? fromManilaDateTimeLocal(endsAtRaw) : null;

  if (!name) return { error: "Event name is required." } as const;
  if (!startsAt) return { error: "Start date and time is required." } as const;
  if (endsAtRaw && !endsAt) return { error: "End date and time is invalid." } as const;
  if (endsAt && endsAt <= startsAt) return { error: "End time must be after the start time." } as const;

  return {
    values: { name, description: description || null, venue: venue || null, startsAt, endsAt },
  } as const;
}

export async function createEvent(_: EventFormState, formData: FormData): Promise<EventFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const input = readEventInput(formData);
  if ("error" in input) return { error: input.error };

  const [event] = await db
    .insert(events)
    .values({ ...input.values, publicSlug: generatePublicSlug(), createdById: session.userId })
    .returning({ id: events.id });

  revalidatePath("/");
  redirect(withToast(`/events/${event.id}`, "success", "Event created. Share the public link to collect registrations."));
}

export async function updateEvent(id: number, _: EventFormState, formData: FormData): Promise<EventFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const input = readEventInput(formData);
  if ("error" in input) return { error: input.error };

  await db.update(events).set(input.values).where(eq(events.id, id));

  revalidatePath("/");
  revalidatePath(`/events/${id}`, "layout");
  redirect(withToast(`/events/${id}`, "success", "Event updated."));
}

export async function deleteEvent(id: number) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect(withToast(`/events/${id}`, "error", "Only admins can delete events."));

  // Participants are removed by the ON DELETE CASCADE on er_participants.event_id
  await db.delete(events).where(eq(events.id, id));

  revalidatePath("/");
  redirect(withToast("/", "success", "Event deleted."));
}

export async function setRegistrationOpen(id: number, open: boolean) {
  const session = await getSession();
  if (!session) redirect("/login");

  await db.update(events).set({ registrationOpen: open }).where(eq(events.id, id));
  revalidatePath(`/events/${id}`, "layout");
}

export async function regeneratePublicLink(id: number) {
  const session = await getSession();
  if (!session) redirect("/login");

  await db.update(events).set({ publicSlug: generatePublicSlug() }).where(eq(events.id, id));
  revalidatePath(`/events/${id}`, "layout");
}
