"use client";

import { useEffect } from "react";

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-er-navy">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
