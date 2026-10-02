"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { primaryBtnCls, secondaryBtnCls } from "@/components/form";
import { PARTICIPANT_IMPORT_HEADERS, buildParticipantImportTemplate, downloadCsv } from "@/lib/csv";
import { importParticipantsCsv, type ImportSummary } from "./actions";

export function ImportParticipantsModal({ eventId, questionLabels }: { eventId: number; questionLabels: string[] }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const router = useRouter();

  function close() {
    setOpen(false);
    setFile(null);
    setResult(null);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const summary = await importParticipantsCsv(eventId, await file.text());
      setResult(summary);
      if (summary.imported > 0) router.refresh();
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondaryBtnCls}>
        Import CSV
      </button>

      {open && (
        <Modal title="Import participants from CSV" onClose={close}>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>
              Use these column headers (any order):
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[...PARTICIPANT_IMPORT_HEADERS, ...questionLabels].map((h) => (
                  <code key={h} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                    {h}
                  </code>
                ))}
              </div>
            </li>
            <li>
              Only Last Name and First Name are required.
              {questionLabels.length > 0 && " Form question columns use the question title; separate multiple checkbox answers with “;”."}{" "}
              <button
                type="button"
                onClick={() => downloadCsv("participants-import-template.csv", buildParticipantImportTemplate(questionLabels))}
                className="font-semibold text-er-navy hover:underline"
              >
                Download template
              </button>
            </li>
            <li>Save as CSV and upload it below. People already in this event are skipped.</li>
          </ol>

          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="mt-4 w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-er-navy file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />

          {result && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-semibold text-er-green">{result.imported} participant(s) imported.</p>
              {result.duplicates > 0 && (
                <p className="text-gray-600">{result.duplicates} skipped — already in this event.</p>
              )}
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-red-600">
                  {result.errors.map((err) => (
                    <li key={err.row}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={close} className={secondaryBtnCls}>
              Close
            </button>
            <button type="button" onClick={handleImport} disabled={!file || importing} className={primaryBtnCls}>
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
