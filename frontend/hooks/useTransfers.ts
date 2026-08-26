"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchTransfers, transfersQueryKey } from "@frontend/lib/queries/listQueries";
import { invalidateFinancialData, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { TransferRecord } from "@frontend/types";

export function useTransfers(period: string) {
  const query = useQuery({
    queryKey: transfersQueryKey(period),
    queryFn: () => fetchTransfers(period),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createTransferRequest(input: {
  fromAccountId: string;
  toAccountId: string;
  amountPkr: number;
  description: string;
  notes?: string;
  transferAt?: string;
}): Promise<TransferRecord> {
  const res = await fetch("/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create transfer");
  refreshAfter(invalidateFinancialData());
  return json.data!;
}

export async function reverseTransferRequest(id: string): Promise<TransferRecord> {
  const res = await fetch(`/api/transfers/${id}/reverse`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to reverse transfer");
  refreshAfter(invalidateFinancialData());
  return json.data!;
}
