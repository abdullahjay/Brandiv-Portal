"use client";

import { useState, useEffect, useCallback } from "react";
import type { LedgerPage, ApiResponse } from "@frontend/types";

export interface LedgerFilters {
  period?: string;
  type?: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer";
  page?: number;
  pageSize?: number;
}

export function useLedger(filters: LedgerFilters) {
  const [data, setData] = useState<LedgerPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.set("period", filters.period);
      if (filters.type) params.set("type", filters.type);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

      const res = await fetch(`/api/ledger?${params.toString()}`);
      const json: ApiResponse<LedgerPage> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load ledger");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filters.period, filters.type, filters.page, filters.pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}
