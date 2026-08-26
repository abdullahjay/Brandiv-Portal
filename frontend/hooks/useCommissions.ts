"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { commissionsQueryKey, fetchCommissions } from "@frontend/lib/queries/listQueries";
import { invalidateCommissions, refreshAfter } from "@frontend/lib/invalidateQueries";
import { apiFetch } from "@frontend/lib/apiFetch";
import type { Commission } from "@frontend/types";

interface UseCommissionsOptions {
  status?: "all" | "pending" | "approved" | "paid";
  stakeholderAccountId?: string;
  clientId?: string;
  period?: string;
  page?: number;
}

export function useCommissions(options: UseCommissionsOptions = {}) {
  const { status = "all", stakeholderAccountId, clientId, period, page = 1 } = options;

  const query = useQuery({
    queryKey: commissionsQueryKey({ status, stakeholderAccountId, clientId, period, page }),
    queryFn: () => fetchCommissions({ status, stakeholderAccountId, clientId, period, page }),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function approveCommissionRequest(id: string): Promise<Commission> {
  const res = await fetch(`/api/commissions/${id}/approve`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to approve commission");
  refreshAfter(invalidateCommissions());
  return json.data!;
}
