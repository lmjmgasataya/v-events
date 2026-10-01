"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "checked-in", label: "Checked in" },
  { value: "not-checked-in", label: "Not checked in" },
] as const;

export function FilterLinks({ current }: { current: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-sm">
      {FILTERS.map((f) => {
        const params = new URLSearchParams(searchParams.toString());
        if (f.value === "all") params.delete("filter");
        else params.set("filter", f.value);
        const query = params.toString();
        return (
          <Link
            key={f.value}
            href={query ? `${pathname}?${query}` : pathname}
            replace
            className={`rounded-md px-3 py-1.5 font-medium whitespace-nowrap transition ${
              current === f.value ? "bg-er-navy text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}
