"use client";

import { useState, useEffect } from "react";
import type { LookupItem, LookupMap, ApiResponse } from "@frontend/types";

// Cache all lookups in module scope so every component shares one fetch.
let _cache: LookupMap | null = null;
let _promise: Promise<LookupMap> | null = null;

async function fetchAllLookups(): Promise<LookupMap> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = fetch("/api/lookups")
    .then((r) => r.json())
    .then((json: ApiResponse<LookupMap>) => {
      if (!json.success) throw new Error(json.message ?? "Failed to load lookups");
      _cache = json.data!;
      _promise = null;
      return _cache;
    });

  return _promise;
}

// Invalidate cache — call after creating/updating a lookup via Settings.
export function invalidateLookupCache() {
  _cache = null;
  _promise = null;
}

// Hook: returns all lookups grouped by type.
export function useAllLookups() {
  const [data, setData] = useState<LookupMap | null>(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (_cache) return;
    fetchAllLookups()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

// Hook: returns options for a single lookup type — convenient for a single select.
export function useLookups(type: string): { options: LookupItem[]; loading: boolean } {
  const { data, loading } = useAllLookups();
  return {
    options: data?.[type] ?? [],
    loading,
  };
}

// Utility: build <select> options from a lookup type using the cached map.
export function lookupOptions(map: LookupMap | null, type: string): LookupItem[] {
  return map?.[type] ?? [];
}
