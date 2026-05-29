import { redirect } from "next/navigation";
import { getSession } from "@backend/lib/auth";
import { getAllSettings } from "@backend/services/settingService";
import Sidebar from "@frontend/components/layout/Sidebar";

// Never statically prerender — auth state and DB data are request-time only
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const settings = await getAllSettings().catch(() => ({} as Record<string, unknown>));
  const logoUrl = (settings.logo_url as string | null | undefined) ?? null;
  const companyName = (settings.company_name as string | null | undefined) ?? null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar user={session.user} logoUrl={logoUrl} companyName={companyName} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          marginLeft: 220,
        }}
      >
        {children}
      </div>
    </div>
  );
}
