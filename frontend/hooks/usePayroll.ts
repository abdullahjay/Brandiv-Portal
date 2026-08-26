"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchPayroll, payrollQueryKey } from "@frontend/lib/queries/listQueries";
import { invalidateFinancialData, invalidatePayroll, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { CreatePayrollInput, PayrollRecord, PayrollRunEntry, PayrollRunResult } from "@frontend/types";

interface UsePayrollOptions {
  status?: "all" | "pending" | "paid";
  userId?: string;
  period?: string;
  page?: number;
}

export function usePayroll(options: UsePayrollOptions = {}) {
  const { status = "all", userId, period, page = 1 } = options;

  const query = useQuery({
    queryKey: payrollQueryKey({ status, userId, period, page }),
    queryFn: () => fetchPayroll({ status, userId, period, page }),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createPayrollRequest(input: CreatePayrollInput): Promise<PayrollRecord> {
  const res = await fetch("/api/payroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create payroll record");
  refreshAfter(invalidatePayroll(), invalidateFinancialData());
  return json.data!;
}

export async function payPayrollRequest(id: string): Promise<PayrollRecord> {
  const res = await fetch(`/api/payroll/${id}/pay`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to mark payroll as paid");
  refreshAfter(invalidatePayroll(), invalidateFinancialData());
  return json.data!;
}

export async function revertPayrollRequest(id: string): Promise<PayrollRecord> {
  const res = await fetch(`/api/payroll/${id}/unpay`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to revert payroll record");
  refreshAfter(invalidatePayroll(), invalidateFinancialData());
  return json.data!;
}

export async function updatePayrollRequest(id: string, data: {
  grossPkr?: number;
  taxPkr?: number;
  deductions?: number;
  notes?: string | null;
}): Promise<PayrollRecord> {
  const res = await fetch(`/api/payroll/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update payroll record");
  refreshAfter(invalidatePayroll());
  return json.data!;
}

export async function runPayrollBatchRequest(
  period: string,
  entries: PayrollRunEntry[],
  markAsPaid = false
): Promise<PayrollRunResult> {
  const res = await fetch("/api/payroll/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period, entries, markAsPaid }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to run payroll");
  refreshAfter(invalidatePayroll(), invalidateFinancialData());
  return json.data!;
}
