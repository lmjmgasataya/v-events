"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 24×24 outline icon paths (Heroicons style), drawn with currentColor
const ICONS = {
  overview:
    "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  data: "M12 4v12m0 0l-4-4m4 4l4-4M4 20h16",
} as const;

const TABS = [
  { href: "/devops-admin", label: "Overview", icon: ICONS.overview },
  { href: "/devops-admin/data", label: "Data", icon: ICONS.data },
];

/** Same look as EventTabs. */
export function DevopsNav() {
  const pathname = usePathname();

  return (
    <nav className="print:hidden flex gap-1 p-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => {
        const active = tab.href === "/devops-admin" ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              active ? "bg-er-navy text-white shadow-sm" : "text-gray-600 hover:bg-er-navy/5 hover:text-er-navy"
            }`}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0"
            >
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
