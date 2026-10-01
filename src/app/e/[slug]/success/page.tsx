import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { formatDateTime } from "@/lib/date";

export default async function PublicRegisterSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { slug } = await params;
  const { name } = await searchParams;
  const [event] = await db.select().from(events).where(eq(events.publicSlug, slug)).limit(1);
  if (!event) notFound();

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-er-green/10 text-2xl text-er-green">
        ✓
      </div>
      <h1 className="text-xl font-bold text-gray-900">You&apos;re registered{name ? `, ${name}` : ""}!</h1>
      <p className="text-sm text-gray-600 mt-2">
        See you at <span className="font-medium">{event.name}</span> on {formatDateTime(event.startsAt)}
        {event.venue && ` at ${event.venue}`}.
      </p>
      <Link href={`/e/${slug}`} className="inline-block mt-6 text-sm text-er-navy hover:underline">
        Register someone else
      </Link>
    </div>
  );
}
