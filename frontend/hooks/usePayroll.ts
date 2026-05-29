"use client";

import { useState, useEffect, useCallback } from "react";
import type { PayrollRecord, ApiResponse, PaginatedResponse, CreatePayrollInput, PayrollRunEntry, PayrollRunResult } from "@frontend/types";

interface UsePayrollOptions {
  status?: "all" | "pending" | "paid";
  userId?: string;
  period?: string;
  page?: number;
}

export function usePayroll(options: UsePayrollOptions = {}) {
  const { status = "all", userId, period, page = 1 } = options;

  const [data, setData] = useState<PaginatedResponse<PayrollRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status, page: String(page) });
      if (userId) params.set("userId", userId);
      if (period) params.set("period", period);

      const res = await fetch(`/api/payroll?${params}`);
      const json: ApiResponse<PaginatedResponse<PayrollRecord>> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch payroll");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [status, userId, period, page]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  return { data, loading, error, refetch: fetchPayroll };
}

export async function createPayrollRequest(input: CreatePayrollInput): Promise<PayrollRecord> {
  const res = await fetch("/api/payroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json: ApiResponse<PayrollRecord> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create payroll record");
  return json.data!;
}

export async function payPayrollRequest(id: string): Promise<PayrollRecord> {
  const res = await fetch(`/api/payroll/${id}/pay`, { method: "POST" });
  const json: ApiResponse<PayrollRecord> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to mark payroll as paid");
  return json.data!;
}

export async function runPayrollBatchRequest(
  period: string,
  entries: PayrollRunEntry[]
): Promise<PayrollRunResult> {
  const res = await fetch("/api/payroll/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ period, entries }),
  });
  const json: ApiResponse<PayrollRunResult> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to run payroll");
  return json.data!;
}
