"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchLedger,
  ledgerQueryKey,
  type LedgerQueryParams,
} from "@frontend/lib/queries/listQueries";

export type LedgerFilters = LedgerQueryParams & {
  type?: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer" | "adjustment";
};

export function useLedger(filters: LedgerFilters) {
  const query = useQuery({
    queryKey: ledgerQueryKey(filters),
    queryFn: () => fetchLedger(filters),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}
