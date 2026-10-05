// Name tag printing for check-in. Client-only (uses the DOM), no server imports.
//
// The tag is a landscape sticker (default 80 × 50 mm; the label size is a per-device
// setting on the check-in page) printed black-only on a thermal label printer. It's printed through the browser's normal print path from a
// hidden iframe, so the label page size doesn't leak into the rest of the app's print
// styles. To print without the dialog, run the check-in laptop's Chrome/Edge with
// --kiosk-printing and make the label printer the default printer.

export interface LabelSize {
  widthMm: number;
  heightMm: number;
}

export const DEFAULT_LABEL_SIZE: LabelSize = { widthMm: 80, heightMm: 50 };
export const LABEL_SIZE_PRESETS: LabelSize[] = [
  { widthMm: 80, heightMm: 50 },
  { widthMm: 80, heightMm: 60 },
  { widthMm: 86, heightMm: 54 },
  { widthMm: 100, heightMm: 70 },
];
export const MIN_LABEL_MM = 30;
export const MAX_LABEL_MM = 150;

export function clampLabelMm(value: number) {
  return Math.round(Math.min(MAX_LABEL_MM, Math.max(MIN_LABEL_MM, value)));
}

/** "80x60" ↔ LabelSize, for storing the setting. Anything unreadable → the default. */
export function parseLabelSize(raw: string | null): LabelSize {
  const m = raw?.match(/^(\d+)x(\d+)$/);
  return m ? { widthMm: clampLabelMm(Number(m[1])), heightMm: clampLabelMm(Number(m[2])) } : DEFAULT_LABEL_SIZE;
}

export function formatLabelSize({ widthMm, heightMm }: LabelSize) {
  return `${widthMm}x${heightMm}`;
}

export interface NameTagData {
  eventName: string;
  /** The big name: nickname, or first name (see nametagName). */
  name: string;
  size: LabelSize;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Layout, all in mm. The border sits a little inside the label edge so a slightly
// off-center feed on the thermal printer doesn't cut it off.
const EDGE_MM = 1.5;
const BORDER_MM = 0.6;
const INNER_PADDING_MM = 2.5;
const INSET_MM = EDGE_MM + BORDER_MM + INNER_PADDING_MM;
const EVENT_FONT_MM = 3.6;
const EVENT_LINE_HEIGHT = 1.2;
const EVENT_RULE_GAP_MM = 2; // space between the event name and the rule under it
const EVENT_RULE_MM = 0.5;
const NAME_LINE_HEIGHT = 1.1;
const MIN_NAME_FONT_MM = 5;
const FONT_FAMILY = "Arial, Helvetica, sans-serif";
const NAME_WEIGHT = 900;
// Width-limited names (most of them) are stretched taller into the spare height, up to this much
const MAX_NAME_STRETCH = 1.6;

let measureCtx: CanvasRenderingContext2D | null | undefined;

/** Rendered text width in em, measured with the same font the tag uses. */
function textWidthEm(text: string, weight: number) {
  if (measureCtx === undefined) {
    measureCtx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return text.length * 0.65; // no canvas — rough average glyph width
  measureCtx.font = `${weight} 100px ${FONT_FAMILY}`;
  return measureCtx.measureText(text).width / 100;
}

/**
 * Sizes the name to fill the space under the event name: as big as fits on one line,
 * or split over two lines at a space when that allows a bigger font (long full names).
 * When width is the limit, `stretch` scales the letters vertically into the leftover height.
 */
function fitName(name: string, contentWidthMm: number, areaHeightMm: number) {
  const usableWidth = contentWidthMm * 0.97; // a little slack for rounding and font hinting
  const fit = (lines: string[]) => ({
    lines,
    sizeMm: Math.min(
      usableWidth / Math.max(...lines.map((l) => textWidthEm(l, NAME_WEIGHT)), 0.01),
      areaHeightMm / (lines.length * NAME_LINE_HEIGHT)
    ),
  });

  let best = fit([name]);
  const words = name.split(/\s+/);
  for (let i = 1; i < words.length; i++) {
    const candidate = fit([words.slice(0, i).join(" "), words.slice(i).join(" ")]);
    if (candidate.sizeMm > best.sizeMm) best = candidate;
  }
  const sizeMm = Math.max(MIN_NAME_FONT_MM, best.sizeMm);
  const textHeight = best.lines.length * sizeMm * NAME_LINE_HEIGHT;
  const stretch = Math.min(MAX_NAME_STRETCH, Math.max(1, areaHeightMm / textHeight));
  return { lines: best.lines, sizeMm, stretch };
}

/** The tag's markup, with inline styles only so it renders the same in the preview and the print iframe. */
export function nameTagHtml({ eventName, name, size }: NameTagData): string {
  const contentWidth = size.widthMm - INSET_MM * 2;
  const contentHeight = size.heightMm - INSET_MM * 2;

  // Event name wraps to at most 2 lines; reserve whatever it actually takes
  const eventWidthMm = (textWidthEm(eventName.toUpperCase(), 700) + eventName.length * 0.04) * EVENT_FONT_MM;
  const eventLines = eventWidthMm > contentWidth ? 2 : 1;
  const headerHeight = eventLines * EVENT_FONT_MM * EVENT_LINE_HEIGHT + EVENT_RULE_GAP_MM + EVENT_RULE_MM;
  const { lines, sizeMm, stretch } = fitName(name.trim(), contentWidth, contentHeight - headerHeight - 1);

  return `<div style="box-sizing:border-box;width:${size.widthMm}mm;height:${size.heightMm}mm;padding:${EDGE_MM}mm;overflow:hidden;background:#fff;color:#000;font-family:${FONT_FAMILY};text-align:center;">
  <div style="box-sizing:border-box;height:100%;border:${BORDER_MM}mm solid #000;border-radius:2.5mm;padding:${INNER_PADDING_MM}mm;display:flex;flex-direction:column;overflow:hidden;">
    <div style="font-size:${EVENT_FONT_MM}mm;font-weight:700;line-height:${EVENT_LINE_HEIGHT};text-transform:uppercase;letter-spacing:0.04em;padding-bottom:${EVENT_RULE_GAP_MM}mm;border-bottom:${EVENT_RULE_MM}mm solid #000;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(eventName)}</div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0;">
      <div style="font-size:${sizeMm.toFixed(2)}mm;font-weight:${NAME_WEIGHT};line-height:${NAME_LINE_HEIGHT};white-space:nowrap;transform:scaleY(${stretch.toFixed(3)});">${lines.map(escapeHtml).join("<br>")}</div>
    </div>
  </div>
</div>`;
}

/** Prints one tag. With --kiosk-printing this goes straight to the default printer. */
export function printNameTag(data: NameTagData) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Name tag</title><style>
@page { size: ${data.size.widthMm}mm ${data.size.heightMm}mm; margin: 0; }
html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head><body>${nameTagHtml(data)}</body></html>`);
  doc.close();

  const cleanup = () => iframe.remove();
  win.addEventListener("afterprint", () => setTimeout(cleanup, 0), { once: true });
  setTimeout(cleanup, 60_000); // in case afterprint never fires

  win.focus();
  win.print();
}
