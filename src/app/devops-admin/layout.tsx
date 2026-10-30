import { Breadcrumbs } from "@/components/Breadcrumbs";
import { requireAdmin } from "./requireAdmin";
import { DevopsNav } from "./DevopsNav";

export default async function DevopsAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Events", href: "/" }, { label: "Devops Admin" }]} />
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-er-navy">Devops Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Admins only · this app&rsquo;s own <span className="font-mono">er_*</span> tables</p>
      </div>
      <DevopsNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
