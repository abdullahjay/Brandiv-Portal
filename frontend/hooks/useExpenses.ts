"use client";

import { useState, useEffect, useCallback } from "react";
import type { Expense, ApiResponse, PaginatedResponse, CreateExpenseInput } from "@frontend/types";

interface UseExpensesOptions {
  category?: string;
  projectId?: string;
  period?: string;
  search?: string;
  page?: number;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const { category, projectId, period, search, page = 1 } = options;

  const [data, setData] = useState<PaginatedResponse<Expense> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (category) params.set("category", category);
      if (projectId) params.set("projectId", projectId);
      if (period) params.set("period", period);
      if (search) params.set("search", search);

      const res = await fetch(`/api/expenses?${params}`);
      const json: ApiResponse<PaginatedResponse<Expense>> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch expenses");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [category, projectId, period, search, page]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return { data, loading, error, refetch: fetchExpenses };
}

export async function createExpenseRequest(input: CreateExpenseInput): Promise<Expense> {
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json: ApiResponse<Expense> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create expense");
  return json.data!;
}

export async function updateExpenseRequest(id: string, input: Partial<CreateExpenseInput>): Promise<Expense> {
  const res = await fetch(`/api/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json: ApiResponse<Expense> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update expense");
  return json.data!;
}

export async function deleteExpenseRequest(id: string): Promise<void> {
  const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
  if (res.status === 204) return;
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete expense");
}
