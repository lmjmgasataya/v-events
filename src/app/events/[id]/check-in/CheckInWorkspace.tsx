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
import type { EventFormConfig } from "@/lib/form-config";
import { printNameTag } from "@/lib/nametag";
import { nametagName } from "@/lib/participants";
import { addWalkIn, checkIn, undoCheckIn } from "./actions";
import { NameTagPanel, useAutoPrint, useLabelSize } from "./NameTagPanel";

export interface CheckInRow {
  id: number;
  firstName: string;
  lastName: string;
  nickname: string;
  contactNumber: string;
  serviceAttended: string | null;
  checkedInAt: string | null;
}

// Pull in check-ins made from other devices
const REFRESH_INTERVAL_MS = 20_000;

function matches(row: CheckInRow, tokens: string[]) {
  const haystack = `${row.firstName} ${row.nickname} ${row.lastName} ${row.contactNumber}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function CheckInWorkspace({
  eventId,
  eventName,
  roster,
  form,
}: {
  eventId: number;
  eventName: string;
  roster: CheckInRow[];
  form: EventFormConfig;
}) {
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
  const [autoPrint, setAutoPrint] = useAutoPrint();
  const [labelSize, setLabelSize] = useLabelSize();
  const [lastTagName, setLastTagName] = useState<string | null>(null);

  function printTag(name: string) {
    setLastTagName(name);
    printNameTag({ eventName, name, size: labelSize });
  }

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
        if (autoPrint) printTag(nametagName(row));
        else setLastTagName(nametagName(row));
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

      <NameTagPanel
        eventName={eventName}
        autoPrint={autoPrint}
        onAutoPrintChange={setAutoPrint}
        size={labelSize}
        onSizeChange={setLabelSize}
        lastName={lastTagName}
      />

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
              <RosterItem
                key={row.id}
                row={row}
                pending={pending}
                onCheckIn={handleCheckIn}
                onUndo={handleUndo}
                onPrint={(r) => printTag(nametagName(r))}
              />
            ))}
          </ul>
        )}
      </section>

      {walkInOpen && (
        <WalkInModal
          eventId={eventId}
          form={form}
          onClose={() => setWalkInOpen(false)}
          onAdded={(name) => (autoPrint ? printTag(name) : setLastTagName(name))}
        />
      )}
    </div>
  );
}

function RosterItem({
  row,
  pending,
  onCheckIn,
  onUndo,
  onPrint,
}: {
  row: CheckInRow;
  pending: boolean;
  onCheckIn: (row: CheckInRow) => void;
  onUndo: (row: CheckInRow) => void;
  onPrint: (row: CheckInRow) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {row.lastName}, {row.firstName}
          {row.nickname && <span className="font-normal text-gray-400"> ({row.nickname})</span>}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {[row.contactNumber, row.serviceAttended].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
      {row.checkedInAt ? (
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-er-green">✓ {formatTime(row.checkedInAt)}</span>
          <button
            type="button"
            onClick={() => onPrint(row)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-er-navy/30 bg-white px-3 py-1.5 text-xs font-semibold text-er-navy transition hover:bg-er-navy hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print tag
          </button>
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

function WalkInModal({
  eventId,
  form,
  onClose,
  onAdded,
}: {
  eventId: number;
  form: EventFormConfig;
  onClose: () => void;
  onAdded: (nametag: string) => void;
}) {
  const [state, action] = useActionState(addWalkIn.bind(null, eventId), undefined);
  useToastOnResult(state?.success ? state : undefined);
  // Latest callbacks without re-running the effect below when the parent re-renders
  const callbacks = useRef({ onClose, onAdded });
  useEffect(() => {
    callbacks.current = { onClose, onAdded };
  });

  useEffect(() => {
    if (!state?.success) return;
    if (state.nametag) callbacks.current.onAdded(state.nametag);
    callbacks.current.onClose();
  }, [state]);

  return (
    <Modal title="Add walk-in" onClose={onClose} wide>
      <p className="text-sm text-gray-500 mb-4">Adds the person to this event and checks them in right away.</p>
      <form action={action} className="flex flex-col gap-4">
        <ParticipantFields form={form} />
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
