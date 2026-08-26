"use client";

import { BrandingProvider } from "@frontend/context/BrandingContext";
import { NotificationsProvider } from "@frontend/context/NotificationsContext";

export default function DashboardProviders({
  logoUrl,
  companyName,
  children,
}: {
  logoUrl?: string | null;
  companyName?: string | null;
  children: React.ReactNode;
}) {
  return (
    <BrandingProvider initialLogoUrl={logoUrl} initialCompanyName={companyName}>
      <NotificationsProvider>{children}</NotificationsProvider>
    </BrandingProvider>
  );
}
