"use client";

import { useEffect, useRef, useState } from "react";
import { secondaryBtnCls } from "@/components/form";

const FORMATS = [
  { format: "xlsx", label: "Excel (.xlsx)" },
  { format: "csv", label: "CSV (.csv)" },
] as const;

/** "Export ▾" → participants as Excel or CSV (export/route.ts). Disabled when the event has no participants. */
export function ExportParticipantsMenu({
  eventId,
  disabled,
  label = "Export",
}: {
  eventId: number;
  disabled: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={disabled ? "No participants to export yet" : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${secondaryBtnCls} disabled:cursor-not-allowed`}
      >
        {label} <span aria-hidden className="ml-1.5 text-xs text-gray-400">▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {FORMATS.map(({ format, label }) => (
            <a
              key={format}
              role="menuitem"
              href={`/events/${eventId}/export?type=participants&format=${format}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
