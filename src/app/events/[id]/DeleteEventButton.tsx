"use client";

import { useTransition } from "react";
import { deleteEvent } from "../actions";

export function DeleteEventButton({ eventId, eventName }: { eventId: number; eventName: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${eventName}" and all of its participants? This can't be undone.`)) return;
    startTransition(() => deleteEvent(eventId));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
    >
      {pending ? "Deleting…" : "Delete event"}
    </button>
  );
}
