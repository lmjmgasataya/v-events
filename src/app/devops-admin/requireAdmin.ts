import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { withToast } from "@/lib/toast";

/**
 * Admin-only gate for Devops Admin pages. Checked in each page as well as the layout:
 * layouts don't re-render on client navigation, so they can't be the only check.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect(withToast("/", "error", "Devops Admin is for admins only."));
  return session;
}
