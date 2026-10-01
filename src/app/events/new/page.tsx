import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventForm } from "../EventForm";
import { createEvent } from "../actions";

export default async function NewEventPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Events", href: "/" }, { label: "New event" }]} />
      <h1 className="text-2xl font-bold text-er-navy mb-6">Create event</h1>
      <EventForm action={createEvent} submitLabel="Create event" cancelHref="/" />
    </div>
  );
}
