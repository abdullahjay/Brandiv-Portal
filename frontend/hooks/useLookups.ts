"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@frontend/lib/apiFetch";
import { invalidateLookups } from "@frontend/lib/invalidateQueries";
import type { LookupItem, LookupMap } from "@frontend/types";

const LOOKUPS_STALE_MS = 10 * 60_000;

async function fetchAllLookups(): Promise<LookupMap> {
  return apiFetch<LookupMap>("/api/lookups");
}

export function invalidateLookupCache() {
  void invalidateLookups();
}

export function useAllLookups() {
  const query = useQuery({
    queryKey: ["lookups"],
    queryFn: fetchAllLookups,
    staleTime: LOOKUPS_STALE_MS,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
}

export function useLookups(type: string): { options: LookupItem[]; loading: boolean } {
  const { data, loading } = useAllLookups();
  return {
    options: data?.[type] ?? [],
    loading,
  };
}

export function lookupOptions(map: LookupMap | null, type: string): LookupItem[] {
  return map?.[type] ?? [];
}
