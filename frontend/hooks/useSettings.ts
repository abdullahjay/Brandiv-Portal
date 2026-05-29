import { useState, useEffect, useCallback } from "react";
import type { ApiResponse, LookupItem } from "@frontend/types";

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
  [key: string]: unknown;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const json: ApiResponse<AppSettings> = await res.json();
      if (json.success && json.data) setSettings(json.data);
      else setError(json.message ?? "Failed to load settings");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { settings, loading, error, refresh: load };
}

export async function saveSettings(data: AppSettings): Promise<AppSettings> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<AppSettings> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to save settings");
  return json.data!;
}

export function useFxRates() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/fx-rates");
      const json: ApiResponse<Record<string, number>> = await res.json();
      if (json.success && json.data) setRates(json.data);
      else setError(json.message ?? "Failed to load rates");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { rates, loading, error, refresh: load };
}

export async function saveFxRates(rates: Record<string, number>): Promise<Record<string, number>> {
  const res = await fetch("/api/settings/fx-rates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rates),
  });
  const json: ApiResponse<Record<string, number>> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to save rates");
  return json.data!;
}

export function useLookups() {
  const [lookups, setLookups] = useState<Record<string, LookupItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/lookups");
      const json: ApiResponse<Record<string, LookupItem[]>> = await res.json();
      if (json.success && json.data) setLookups(json.data);
      else setError(json.message ?? "Failed to load lookups");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { lookups, loading, error, refresh: load };
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
  const json: ApiResponse<LookupItem> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create lookup");
  return json.data!;
}

export async function updateLookupRequest(id: string, data: { label?: string; value?: string; code?: string | null; sortOrder?: number; active?: boolean }): Promise<LookupItem> {
  const res = await fetch(`/api/settings/lookups/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<LookupItem> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update lookup");
  return json.data!;
}

export async function deleteLookupRequest(id: string): Promise<void> {
  const res = await fetch(`/api/settings/lookups/${id}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete lookup");
}
