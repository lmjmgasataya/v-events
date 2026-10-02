"use server";

import { db } from "@/db";
import { events, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isUniqueViolation } from "@/lib/db-errors";
import { normalizeFormConfig } from "@/lib/form-config";
import { readParticipantInput, toParticipantValues, validateParticipantInput } from "@/lib/participants";

export type PublicRegisterState = { error?: string } | undefined;

// Public (no login) — anyone with the event's link can call this.
export async function registerForEvent(
  slug: string,
  _: PublicRegisterState,
  formData: FormData
): Promise<PublicRegisterState> {
  const [event] = await db.select().from(events).where(eq(events.publicSlug, slug)).limit(1);
  if (!event) return { error: "This event link is no longer valid." };
  if (!event.registrationOpen) return { error: "Registration for this event is closed." };

  const form = normalizeFormConfig(event.form);
  const input = readParticipantInput(formData, form);
  // Status is staff-only; ignore anything posted from the public form
  input.status = "";
  const error = validateParticipantInput(input, form, { strict: true });
  if (error) return { error };

  try {
    await db.insert(participants).values({ ...toParticipantValues(input), eventId: event.id, source: "public" });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "You're already registered for this event — see you there!" };
    throw err;
  }

  revalidatePath(`/events/${event.id}`, "layout");
  revalidatePath("/");
  redirect(`/e/${slug}/success?name=${encodeURIComponent(input.firstName)}`);
}
