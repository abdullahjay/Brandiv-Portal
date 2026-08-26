"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { expensesQueryKey, fetchExpenses } from "@frontend/lib/queries/listQueries";
import { invalidateExpenses, invalidateFinancialData, refreshAfter } from "@frontend/lib/invalidateQueries";
import { apiFetch } from "@frontend/lib/apiFetch";
import type { Expense, CreateExpenseInput } from "@frontend/types";

interface UseExpensesOptions {
  category?: string;
  projectId?: string;
  period?: string;
  search?: string;
  page?: number;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const { category, projectId, period, search, page = 1 } = options;

  const query = useQuery({
    queryKey: expensesQueryKey({ category, projectId, period, search, page }),
    queryFn: () => fetchExpenses({ category, projectId, period, search, page }),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createExpenseRequest(input: CreateExpenseInput): Promise<Expense> {
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create expense");
  refreshAfter(invalidateExpenses(), invalidateFinancialData());
  return json.data!;
}

export async function updateExpenseRequest(id: string, input: Partial<CreateExpenseInput>): Promise<Expense> {
  const res = await fetch(`/api/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update expense");
  refreshAfter(invalidateExpenses(), invalidateFinancialData());
  return json.data!;
}

export async function deleteExpenseRequest(id: string): Promise<void> {
  const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  if (res.status === 204) return;
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete expense");
  refreshAfter(invalidateExpenses(), invalidateFinancialData());
}
