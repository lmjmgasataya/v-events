"use client";

import { secondaryBtnCls } from "@/components/form";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={secondaryBtnCls}>
      Print
    </button>
  );
}
