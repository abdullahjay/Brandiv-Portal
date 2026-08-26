"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  cashFlowQueryKey,
  fetchCashFlowStatement,
  fetchPnLStatement,
  pnLQueryKey,
} from "@frontend/lib/queries/listQueries";
import { apiFetch } from "@frontend/lib/apiFetch";
import type { AccountStatement } from "@frontend/types";

export function usePnL(period: string) {
  const query = useQuery({
    queryKey: pnLQueryKey(period),
    queryFn: () => fetchPnLStatement(period),
    enabled: !!period,
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export function useCashFlow(period: string) {
  const query = useQuery({
    queryKey: cashFlowQueryKey(period),
    queryFn: () => fetchCashFlowStatement(period),
    enabled: !!period,
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export function useAccountStatement(accountId: string | null, period: string) {
  const query = useQuery({
    queryKey: ["statements", "account", accountId, period],
    queryFn: async () => {
      const url = period
        ? `/api/accounts/${accountId}/statement?period=${period}`
        : `/api/accounts/${accountId}/statement`;
      return apiFetch<AccountStatement>(url);
    },
    enabled: !!accountId,
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}
