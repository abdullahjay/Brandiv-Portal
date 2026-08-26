"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type BrandingState = {
  logoUrl: string | null;
  companyName: string | null;
};

type BrandingContextValue = BrandingState & {
  logoSrc: string | null;
  setBranding: (patch: Partial<BrandingState>) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({
  initialLogoUrl,
  initialCompanyName,
  children,
}: {
  initialLogoUrl?: string | null;
  initialCompanyName?: string | null;
  children: React.ReactNode;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? null);
  const [companyName, setCompanyName] = useState(initialCompanyName ?? null);
  const [logoVersion, setLogoVersion] = useState(0);

  const setBranding = useCallback((patch: Partial<BrandingState>) => {
    if ("logoUrl" in patch) {
      setLogoUrl(patch.logoUrl ?? null);
      setLogoVersion((v) => v + 1);
    }
    if ("companyName" in patch) {
      setCompanyName(patch.companyName ?? null);
    }
  }, []);

  const logoSrc = useMemo(() => {
    if (!logoUrl) return null;
    const separator = logoUrl.includes("?") ? "&" : "?";
    return `${logoUrl}${separator}v=${logoVersion}`;
  }, [logoUrl, logoVersion]);

  const value = useMemo(
    () => ({ logoUrl, companyName, logoSrc, setBranding }),
    [logoUrl, companyName, logoSrc, setBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return ctx;
}
