"use client";

import { useState, useTransition } from "react";
import QRCode from "react-qr-code";
import { regeneratePublicLink, setRegistrationOpen } from "../actions";
import { useToast } from "@/components/toast/ToastContext";
import { inputCls, primaryBtnCls, secondaryBtnCls } from "@/components/form";

export function PublicLinkCard({
  eventId,
  url,
  registrationOpen,
}: {
  eventId: number;
  url: string;
  registrationOpen: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      showToast("success", "Link copied to clipboard.");
    } catch {
      showToast("error", "Couldn't copy — select the link and copy it manually.");
    }
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ url }).catch(() => {});
    } else {
      await copy();
    }
  }

  function regenerate() {
    if (!confirm("Generate a new link? The current link will stop working for anyone who has it.")) return;
    startTransition(async () => {
      await regeneratePublicLink(eventId);
      showToast("success", "New public link generated.");
    });
  }

  function toggleOpen() {
    startTransition(async () => {
      await setRegistrationOpen(eventId, !registrationOpen);
      showToast("success", registrationOpen ? "Public registration closed." : "Public registration opened.");
    });
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Public registration link</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Anyone with this link can view the event and register — no login needed.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            registrationOpen ? "bg-er-green/10 text-er-green" : "bg-gray-100 text-gray-500"
          }`}
        >
          {registrationOpen ? "Open" : "Closed"}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className={`${inputCls} font-mono`} />
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={copy} className={primaryBtnCls}>
            Copy
          </button>
          <button type="button" onClick={share} className={secondaryBtnCls}>
            Share
          </button>
          <button type="button" onClick={() => setShowQr((v) => !v)} className={secondaryBtnCls}>
            {showQr ? "Hide QR" : "QR code"}
          </button>
        </div>
      </div>

      {showQr && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="bg-white p-3 border border-gray-200 rounded-lg">
            <QRCode value={url} size={200} />
          </div>
          <p className="text-xs text-gray-400">Scan to open the registration page</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <button type="button" onClick={toggleOpen} disabled={pending} className="text-er-navy font-medium hover:underline disabled:opacity-50">
          {registrationOpen ? "Close public registration" : "Open public registration"}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="text-er-navy font-medium hover:underline">
          Open page ↗
        </a>
        <button type="button" onClick={regenerate} disabled={pending} className="text-gray-500 hover:underline disabled:opacity-50">
          Regenerate link
        </button>
      </div>
    </section>
  );
}
