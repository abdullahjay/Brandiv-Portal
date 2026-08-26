import { getCachedSettings } from "@backend/services/settingService";
import { getRequestUser } from "@backend/lib/requestAuth";
import DashboardProviders from "@frontend/components/layout/DashboardProviders";
import Sidebar from "@frontend/components/layout/Sidebar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getRequestUser();

  const settings = await getCachedSettings().catch(() => ({} as Record<string, unknown>));
  const logoUrl = (settings.logo_url as string | null | undefined) ?? null;
  const companyName = (settings.company_name as string | null | undefined) ?? null;

  return (
    <DashboardProviders logoUrl={logoUrl} companyName={companyName}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar user={user} />
        <div className="main-content">
          {children}
        </div>
      </div>
    </DashboardProviders>
  );
}
