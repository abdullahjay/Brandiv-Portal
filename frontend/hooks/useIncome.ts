"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { incomeQueryKey, fetchIncome } from "@frontend/lib/queries/listQueries";
import { invalidateAfterIncomeRecord, invalidateFinancialData, invalidateIncome, refreshAfter } from "@frontend/lib/invalidateQueries";
import { apiFetch } from "@frontend/lib/apiFetch";
import type { IncomeRecord, CreateIncomeInput } from "@frontend/types";

interface UseIncomeOptions {
  status?: "all" | "pending" | "cleared";
  clientId?: string;
  period?: string;
  search?: string;
  page?: number;
}

export function useIncome(options: UseIncomeOptions = {}) {
  const { status = "all", clientId, period, search = "", page = 1 } = options;

  const query = useQuery({
    queryKey: incomeQueryKey({ status, clientId, period, search, page }),
    queryFn: () => fetchIncome({ status, clientId, period, search, page }),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export function useIncomeRecord(id: string | null) {
  const query = useQuery({
    queryKey: ["income", id],
    queryFn: () => apiFetch<IncomeRecord>(`/api/income/${id}`),
    enabled: !!id,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createIncomeRequest(body: CreateIncomeInput): Promise<IncomeRecord> {
  const res = await fetch("/api/income", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to record income");
  invalidateAfterIncomeRecord({ invoiceId: body.invoiceId });
  return json.data!;
}

export async function updateIncomeRequest(id: string, body: Partial<CreateIncomeInput>): Promise<IncomeRecord> {
  const res = await fetch(`/api/income/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update income record");
  refreshAfter(invalidateIncome(id), invalidateFinancialData());
  return json.data!;
}

export async function clearIncomeRequest(id: string): Promise<IncomeRecord> {
  const res = await fetch(`/api/income/${id}`, { method: "PATCH" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to mark income as cleared");
  refreshAfter(invalidateIncome(id), invalidateFinancialData());
  return json.data!;
}
