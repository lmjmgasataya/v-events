"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { Participant } from "@/db/schema";
import { formatDate, formatDateTime } from "@/lib/date";
import { SOURCE_LABELS } from "@/lib/constants";
import { useToast } from "@/components/toast/ToastContext";
import { deleteParticipant } from "./actions";

export function ParticipantsTable({ eventId, rows }: { eventId: number; rows: Participant[] }) {
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleDelete(p: Participant) {
    if (!confirm(`Remove ${p.firstName} ${p.lastName} from this event?`)) return;
    startTransition(async () => {
      await deleteParticipant(eventId, p.id);
      showToast("success", `${p.firstName} ${p.lastName} removed.`);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        No participants yet. Add them one by one, import a CSV, or share the public link.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Last name</th>
            <th className="px-4 py-3 font-medium">First name</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Lifestage</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Registered</th>
            <th className="px-4 py-3 font-medium">Checked in</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-2.5 font-medium text-gray-900">{p.lastName}</td>
              <td className="px-4 py-2.5 text-gray-900">{p.firstName}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{p.contactNumber || "—"}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{p.serviceAttended ?? "—"}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{p.lifestage ?? "—"}</td>
              <td className="px-4 py-2.5 text-gray-600">{p.status}</td>
              <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap" title={SOURCE_LABELS[p.source] ?? p.source}>
                {formatDate(p.registeredAt)}
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                {p.checkedInAt ? (
                  <span className="text-er-green font-medium">{formatDateTime(p.checkedInAt)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                <Link href={`/events/${eventId}/participants/${p.id}/edit`} className="text-er-navy hover:underline mr-3">
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  disabled={pending}
                  className="text-red-600 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
