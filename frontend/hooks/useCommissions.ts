"use client";

import { useState, useEffect, useCallback } from "react";
import type { Commission, ApiResponse, PaginatedResponse } from "@frontend/types";

interface UseCommissionsOptions {
  status?: "all" | "pending" | "approved" | "paid";
  stakeholderAccountId?: string;
  clientId?: string;
  period?: string;
  page?: number;
}

export function useCommissions(options: UseCommissionsOptions = {}) {
  const { status = "all", stakeholderAccountId, clientId, period, page = 1 } = options;

  const [data, setData] = useState<PaginatedResponse<Commission> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        ...(stakeholderAccountId && { stakeholderAccountId }),
        ...(clientId && { clientId }),
        ...(period && { period }),
      });
      const res = await fetch(`/api/commissions?${params}`);
      const json: ApiResponse<PaginatedResponse<Commission>> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch commissions");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [status, stakeholderAccountId, clientId, period, page]);

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);

  return { data, loading, error, refetch: fetchCommissions };
}

export async function approveCommissionRequest(id: string): Promise<Commission> {
  const res = await fetch(`/api/commissions/${id}/approve`, { method: "POST" });
  const json: ApiResponse<Commission> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to approve commission");
  return json.data!;
}
