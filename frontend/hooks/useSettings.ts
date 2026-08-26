import { useQuery } from "@tanstack/react-query";
import {
  fetchFxRates,
  fetchSettings,
  fetchSettingsLookups,
  fxRatesQueryKey,
  settingsLookupsQueryKey,
  settingsQueryKey,
} from "@frontend/lib/queries/listQueries";
import { invalidateLookups, invalidateSettings, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { LookupItem } from "@frontend/types";

export interface AppSettings {
  invoice_prefix?: string;
  default_wht_pct?: number;
  default_gst_pct?: number;
  company_name?: string;
  company_ntn?: string;
  company_address?: string;
  logo_url?: string | null;
  commission_rate_first?: number;
  commission_rate_recurring?: number;
  managing_commission_rate?: number;
  [key: string]: unknown;
}

export function useSettings() {
  const query = useQuery({
    queryKey: settingsQueryKey(),
    queryFn: fetchSettings,
    staleTime: 60_000,
  });

  return {
    settings: query.data ?? {},
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refresh: () => void query.refetch(),
  };
}

export async function saveSettings(data: AppSettings): Promise<AppSettings> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to save settings");
  refreshAfter(invalidateSettings());
  return json.data!;
}

export function useFxRates() {
  const query = useQuery({
    queryKey: fxRatesQueryKey(),
    queryFn: fetchFxRates,
    staleTime: 60_000,
  });

  return {
    rates: query.data ?? {},
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refresh: () => void query.refetch(),
  };
}

export async function saveFxRates(rates: Record<string, number>): Promise<Record<string, number>> {
  const res = await fetch("/api/settings/fx-rates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rates),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to save rates");
  refreshAfter(invalidateSettings());
  return json.data!;
}

export function useLookups() {
  const query = useQuery({
    queryKey: settingsLookupsQueryKey(),
    queryFn: fetchSettingsLookups,
    staleTime: 60_000,
  });

  return {
    lookups: query.data ?? {},
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refresh: () => void query.refetch(),
  };
}

export async function createLookupRequest(data: {
  type: string;
  value: string;
  label: string;
  code?: string | null;
  sortOrder?: number;
}): Promise<LookupItem> {
  const res = await fetch("/api/settings/lookups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create lookup");
  refreshAfter(invalidateLookups());
  return json.data!;
}

export async function updateLookupRequest(id: string, data: { label?: string; value?: string; code?: string | null; sortOrder?: number; active?: boolean }): Promise<LookupItem> {
  const res = await fetch(`/api/settings/lookups/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update lookup");
  refreshAfter(invalidateLookups());
  return json.data!;
}

export async function deleteLookupRequest(id: string): Promise<void> {
  const res = await fetch(`/api/settings/lookups/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete lookup");
  refreshAfter(invalidateLookups());
}
