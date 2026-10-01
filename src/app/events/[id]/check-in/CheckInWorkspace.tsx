"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastContext";
import { useToastOnResult } from "@/components/toast/useToastOnResult";
import { Modal } from "@/components/Modal";
import { ParticipantFields } from "@/components/ParticipantFields";
import { FormError, inputCls, primaryBtnCls, secondaryBtnCls } from "@/components/form";
import { SubmitButton } from "@/components/SubmitButton";
import { formatTime } from "@/lib/date";
import { addWalkIn, checkIn, undoCheckIn } from "./actions";

export interface CheckInRow {
  id: number;
  firstName: string;
  lastName: string;
  contactNumber: string;
  serviceAttended: string | null;
  checkedInAt: string | null;
}

// Pull in check-ins made from other devices
const REFRESH_INTERVAL_MS = 20_000;

function matches(row: CheckInRow, tokens: string[]) {
  const haystack = `${row.firstName} ${row.lastName} ${row.contactNumber}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function CheckInWorkspace({ eventId, roster }: { eventId: number; roster: CheckInRow[] }) {
  const [query, setQuery] = useState("");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimisticRoster, setOptimistic] = useOptimistic(
    roster,
    (rows, update: { id: number; checkedInAt: string | null }) =>
      rows.map((r) => (r.id === update.id ? { ...r, checkedInAt: update.checkedInAt } : r))
  );
  const { showToast } = useToast();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  const checkedInCount = optimisticRoster.filter((r) => r.checkedInAt).length;
  const searching = query.trim() !== "";
  // Whole roster is already in the page; searching just filters it in the browser
  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return tokens.length ? optimisticRoster.filter((r) => matches(r, tokens)) : optimisticRoster;
  }, [optimisticRoster, query]);

  function handleCheckIn(row: CheckInRow) {
    startTransition(async () => {
      setOptimistic({ id: row.id, checkedInAt: new Date().toISOString() });
      const result = await checkIn(eventId, row.id);
      if (result.ok) {
        showToast("success", `${row.firstName} ${row.lastName} checked in.`);
        setQuery("");
        searchRef.current?.focus();
      } else {
        showToast("warning", `${row.firstName} ${row.lastName}: ${result.error}`);
      }
    });
  }

  function handleUndo(row: CheckInRow) {
    if (!confirm(`Undo check-in for ${row.firstName} ${row.lastName}?`)) return;
    startTransition(async () => {
      setOptimistic({ id: row.id, checkedInAt: null });
      await undoCheckIn(eventId, row.id);
      showToast("success", `Check-in undone for ${row.firstName} ${row.lastName}.`);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter checks in the only matching person — fast path for a busy door
    if (e.key !== "Enter" || !searching) return;
    const pendingMatches = results.filter((r) => !r.checkedInAt);
    if (results.length === 1 && pendingMatches.length === 1) {
      e.preventDefault();
      handleCheckIn(pendingMatches[0]);
    }
  }

  const total = optimisticRoster.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <p className="text-3xl font-bold text-er-navy">
            {checkedInCount} <span className="text-lg font-medium text-gray-400">/ {total} checked in</span>
          </p>
          <div className="mt-2 h-2 w-64 max-w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-er-green transition-all"
              style={{ width: total ? `${(checkedInCount / total) * 100}%` : 0 }}
            />
          </div>
        </div>
        <button type="button" onClick={() => setWalkInOpen(true)} className={secondaryBtnCls}>
          + Walk-in
        </button>
      </div>

      <input
        ref={searchRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder="Type a name or contact number…"
        className={`${inputCls} text-base py-3`}
      />

      <section>
        <p className="text-xs text-gray-500 mb-2">
          {total === 0
            ? "No participants yet. Add them on the Participants tab, or add a walk-in."
            : !searching
              ? `${total} participant${total === 1 ? "" : "s"}`
              : results.length === 0
                ? "No match. Not registered? Add them as a walk-in."
                : `${results.length} match${results.length === 1 ? "" : "es"}`}
        </p>
        {results.length > 0 && (
          <ul className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {results.map((row) => (
              <RosterItem key={row.id} row={row} pending={pending} onCheckIn={handleCheckIn} onUndo={handleUndo} />
            ))}
          </ul>
        )}
      </section>

      {walkInOpen && <WalkInModal eventId={eventId} onClose={() => setWalkInOpen(false)} />}
    </div>
  );
}

function RosterItem({
  row,
  pending,
  onCheckIn,
  onUndo,
}: {
  row: CheckInRow;
  pending: boolean;
  onCheckIn: (row: CheckInRow) => void;
  onUndo: (row: CheckInRow) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {row.lastName}, {row.firstName}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {[row.contactNumber, row.serviceAttended].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
      {row.checkedInAt ? (
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-er-green">✓ {formatTime(row.checkedInAt)}</span>
          <button type="button" onClick={() => onUndo(row)} disabled={pending} className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50">
            Undo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onCheckIn(row)}
          className="shrink-0 rounded-lg bg-er-green px-4 py-2 text-sm font-semibold text-white hover:bg-er-green/90 transition"
        >
          Check in
        </button>
      )}
    </li>
  );
}

function WalkInModal({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const [state, action] = useActionState(addWalkIn.bind(null, eventId), undefined);
  useToastOnResult(state?.success ? state : undefined);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <Modal title="Add walk-in" onClose={onClose} wide>
      <p className="text-sm text-gray-500 mb-4">Adds the person to this event and checks them in right away.</p>
      <form action={action} className="flex flex-col gap-4">
        <ParticipantFields />
        <FormError message={state?.error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtnCls}>
            Cancel
          </button>
          <SubmitButton label="Add & check in" pendingLabel="Saving…" className={primaryBtnCls} />
        </div>
      </form>
    </Modal>
  );
}
