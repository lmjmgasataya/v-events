import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEventOrNotFound } from "@/lib/events";
import { toManilaDateTimeLocal } from "@/lib/date";
import { EventForm } from "../../EventForm";
import { updateEvent } from "../../actions";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const event = await getEventOrNotFound((await params).id);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Edit event</h2>
      <EventForm
        action={updateEvent.bind(null, event.id)}
        submitLabel="Save changes"
        cancelHref={`/events/${event.id}`}
        defaultValues={{
          name: event.name,
          description: event.description,
          venue: event.venue,
          startsAt: toManilaDateTimeLocal(event.startsAt),
          endsAt: toManilaDateTimeLocal(event.endsAt),
        }}
      />
    </div>
  );
}
