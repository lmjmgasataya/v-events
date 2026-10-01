import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEventOrNotFound } from "@/lib/events";
import { formatDateTime } from "@/lib/date";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventTabs } from "./EventTabs";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const event = await getEventOrNotFound((await params).id);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Events", href: "/" }, { label: event.name }]} />
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-er-navy">{event.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {formatDateTime(event.startsAt)}
          {event.endsAt && ` – ${formatDateTime(event.endsAt)}`}
          {event.venue && ` · ${event.venue}`}
        </p>
      </div>
      <EventTabs eventId={event.id} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
