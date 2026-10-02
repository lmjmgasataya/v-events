"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 24×24 outline icon paths (Heroicons style), drawn with currentColor
const ICONS = {
  overview: "M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10",
  participants:
    "M17 20h5v-2a4 4 0 00-5.4-3.7M17 20H7m10 0v-2c0-.7-.1-1.3-.4-1.9M7 20H2v-2a4 4 0 015.4-3.7M7 20v-2c0-.7.1-1.3.4-1.9m0 0a5 5 0 019.2 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  checkIn: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  report: "M9 19V9m4 10V5m4 14v-7M5 19v-3",
  form: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h4",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11.8 15H9v-2.8l8.6-8.6z",
} as const;

export function EventTabs({ eventId }: { eventId: number }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;
  const tabs = [
    { href: base, label: "Overview", icon: ICONS.overview },
    { href: `${base}/participants`, label: "Participants", icon: ICONS.participants },
    { href: `${base}/check-in`, label: "Check-in", icon: ICONS.checkIn },
    { href: `${base}/report`, label: "Report", icon: ICONS.report },
    { href: `${base}/form`, label: "Form", icon: ICONS.form },
    { href: `${base}/edit`, label: "Edit", icon: ICONS.edit },
  ];

  return (
    <nav className="print:hidden flex gap-1 p-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
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
