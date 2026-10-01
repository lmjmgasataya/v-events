import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { formatDateTime } from "@/lib/date";
import { PublicRegisterForm } from "./PublicRegisterForm";

async function getEventBySlug(slug: string) {
  const [event] = await db.select().from(events).where(eq(events.publicSlug, slug)).limit(1);
  return event;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return event ? { title: `Register · ${event.name}`, description: event.description ?? undefined } : {};
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="bg-er-navy text-white rounded-2xl p-6">
        <p className="text-xs uppercase tracking-widest text-white/60">You&apos;re invited</p>
        <h1 className="text-2xl font-bold mt-1">{event.name}</h1>
        <p className="text-sm text-white/80 mt-2">
          {formatDateTime(event.startsAt)}
          {event.endsAt && ` – ${formatDateTime(event.endsAt)}`}
        </p>
        {event.venue && <p className="text-sm text-white/80">{event.venue}</p>}
        {event.description && <p className="text-sm text-white/90 mt-4 whitespace-pre-line">{event.description}</p>}
      </div>

      {event.registrationOpen ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Register</h2>
          <PublicRegisterForm slug={slug} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="font-medium text-gray-700">Registration is closed</p>
          <p className="text-sm text-gray-500 mt-1">Please reach out to the event organizers.</p>
        </div>
      )}
    </div>
  );
}
