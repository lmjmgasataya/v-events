import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { NavigationProgress } from "@/components/NavigationProgress";
import { Toaster } from "@/components/toast/Toaster";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Events",
  description: "Event registration and check-in",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} min-h-full antialiased text-gray-800`}>
        <Toaster>
          <NavigationProgress />
          {session && (
            <header className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <Link href="/" className="text-lg font-bold text-er-navy hover:opacity-80 transition">
                    Events
                  </Link>
                  <nav className="flex items-center gap-4 text-sm">
                    <Link href="/" className="text-gray-500 hover:text-er-navy transition">
                      All events
                    </Link>
                    <Link href="/reports" className="text-gray-500 hover:text-er-navy transition">
                      Reports
                    </Link>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{session.name}</span>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-er-navy underline underline-offset-2 transition"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            </header>
          )}
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </Toaster>
      </body>
    </html>
  );
}
