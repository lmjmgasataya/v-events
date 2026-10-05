"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Toggle } from "@/components/Toggle";
import { inputCls, secondaryBtnCls } from "@/components/form";
import {
  LABEL_SIZE_PRESETS,
  MAX_LABEL_MM,
  MIN_LABEL_MM,
  clampLabelMm,
  formatLabelSize,
  nameTagHtml,
  parseLabelSize,
  printNameTag,
  type LabelSize,
} from "@/lib/nametag";

// Name tag settings are remembered per device (localStorage): only the laptop with the
// printer should auto-print, and the label size depends on the labels loaded in it.
const AUTO_PRINT_KEY = "er-nametag-autoprint";
const LABEL_SIZE_KEY = "er-nametag-size";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked — the setting just won't stick
  }
  listeners.forEach((l) => l());
}

export function useAutoPrint(): [boolean, (on: boolean) => void] {
  const autoPrint = useSyncExternalStore(subscribe, () => readSetting(AUTO_PRINT_KEY) === "1", () => false);
  return [autoPrint, (on) => writeSetting(AUTO_PRINT_KEY, on ? "1" : "0")];
}

export function useLabelSize(): [LabelSize, (size: LabelSize) => void] {
  // The snapshot is the stored string (stable between renders), parsed afterwards
  const raw = useSyncExternalStore(subscribe, () => readSetting(LABEL_SIZE_KEY), () => null);
  return [parseLabelSize(raw), (size) => writeSetting(LABEL_SIZE_KEY, formatLabelSize(size))];
}

const PX_PER_MM = 96 / 25.4;

/**
 * The tag from the same markup that gets printed, scaled to fill the width of its
 * container (keeping the label's proportions).
 */
export function NameTagPreview({ eventName, name, size }: { eventName: string; name: string; size: LabelSize }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / (size.widthMm * PX_PER_MM));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [size.widthMm]);

  return (
    <div
      ref={boxRef}
      className="relative w-full rounded-md shadow-sm ring-1 ring-gray-300 overflow-hidden bg-white"
      style={{ aspectRatio: `${size.widthMm} / ${size.heightMm}` }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `scale(${scale})` }}
        dangerouslySetInnerHTML={{ __html: nameTagHtml({ eventName, name, size }) }}
      />
    </div>
  );
}

export function NameTagPanel({
  eventName,
  autoPrint,
  onAutoPrintChange,
  size,
  onSizeChange,
  lastName,
}: {
  eventName: string;
  autoPrint: boolean;
  onAutoPrintChange: (on: boolean) => void;
  size: LabelSize;
  onSizeChange: (size: LabelSize) => void;
  /** Name tag name of the most recent check-in, shown in the preview until the user types one. */
  lastName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState("");
  const previewName = sample.trim() || lastName || "Juan";
  const sizeLabel = `${size.widthMm} × ${size.heightMm} mm`;

  return (
    <section className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-er-navy"
        >
          <span className={`inline-block transition ${open ? "rotate-90" : ""}`}>▸</span>
          Name tags <span className="font-normal text-gray-400">· {sizeLabel}</span>
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Auto-print on check-in
          <Toggle checked={autoPrint} onChange={onAutoPrintChange} label="Auto-print name tag on check-in" />
        </label>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4 grid gap-5 md:grid-cols-2">
          <div className="min-w-0">
            <NameTagPreview eventName={eventName} name={previewName} size={size} />
            <p className="mt-1 text-xs text-gray-400">Preview, enlarged · prints at {sizeLabel}</p>
          </div>
          <div className="flex flex-col gap-3 text-sm min-w-0">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">Label size (width × height, mm)</p>
              <div className="flex items-center gap-2">
                <MmInput label="Label width" value={size.widthMm} onChange={(widthMm) => onSizeChange({ ...size, widthMm })} />
                <span className="text-gray-400">×</span>
                <MmInput label="Label height" value={size.heightMm} onChange={(heightMm) => onSizeChange({ ...size, heightMm })} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LABEL_SIZE_PRESETS.map((p) => {
                  const active = p.widthMm === size.widthMm && p.heightMm === size.heightMm;
                  return (
                    <button
                      key={formatLabelSize(p)}
                      type="button"
                      onClick={() => onSizeChange(p)}
                      aria-pressed={active}
                      className={`rounded-md border px-2 py-1 text-xs transition ${
                        active ? "border-er-navy bg-er-navy text-white" : "border-gray-300 text-gray-600 hover:border-er-navy/50"
                      }`}
                    >
                      {p.widthMm} × {p.heightMm}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="nametag-sample" className="block text-sm font-medium text-gray-700 mb-1">
                Preview a name
              </label>
              <input
                id="nametag-sample"
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                maxLength={40}
                placeholder={lastName || "Juan"}
                className={inputCls}
              />
            </div>
            <button
              type="button"
              onClick={() => printNameTag({ eventName, name: previewName, size })}
              className={`${secondaryBtnCls} self-start`}
            >
              Test print
            </button>
            <p className="text-xs text-gray-500 leading-relaxed">
              Shows the nickname, or the first word of the first name if there&apos;s none. Auto-print and label size are saved on this
              device only — turn auto-print on just on the laptop connected to the label printer. To print without the
              print dialog, start Chrome with <code className="rounded bg-gray-100 px-1">--kiosk-printing</code> and set
              the label printer as the default printer, with the same paper size and no margins.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/** Commits on blur/Enter so typing "1" on the way to "100" doesn't get clamped to the minimum. */
function MmInput({ label, value, onChange }: { label: string; value: number; onChange: (mm: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const mm = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(mm)) onChange(clampLabelMm(mm));
    setDraft(null);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={MIN_LABEL_MM}
      max={MAX_LABEL_MM}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className={`${inputCls} w-20`}
    />
  );
}
