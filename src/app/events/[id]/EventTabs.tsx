"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function EventTabs({ eventId }: { eventId: number }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/participants`, label: "Participants" },
    { href: `${base}/check-in`, label: "Check-in" },
    { href: `${base}/report`, label: "Report" },
    { href: `${base}/edit`, label: "Edit" },
  ];

  return (
    <nav className="print:hidden flex gap-1 border-b border-gray-200 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              active ? "border-er-navy text-er-navy" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
