"use client";

import { useState, useEffect, useCallback } from "react";
import type { IncomeRecord, ApiResponse, IncomeListResponse, CreateIncomeInput } from "@frontend/types";

interface UseIncomeOptions {
  status?: "all" | "pending" | "cleared";
  clientId?: string;
  period?: string;
  search?: string;
  page?: number;
}

export function useIncome(options: UseIncomeOptions = {}) {
  const { status = "all", clientId, period, search = "", page = 1 } = options;

  const [data, setData] = useState<IncomeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncome = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        ...(search && { search }),
        ...(clientId && { clientId }),
        ...(period && { period }),
      });
      const res = await fetch(`/api/income?${params}`);
      const json: ApiResponse<IncomeListResponse> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch income records");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [status, clientId, period, search, page]);

  useEffect(() => { fetchIncome(); }, [fetchIncome]);

  return { data, loading, error, refetch: fetchIncome };
}

export function useIncomeRecord(id: string | null) {
  const [data, setData] = useState<IncomeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!id) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/income/${id}`);
      const json: ApiResponse<IncomeRecord> = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  return { data, loading, error, refetch: fetchRecord };
}

export async function createIncomeRequest(body: CreateIncomeInput): Promise<IncomeRecord> {
  const res = await fetch("/api/income", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<IncomeRecord> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to record income");
  return json.data!;
}

export async function updateIncomeRequest(id: string, body: Partial<CreateIncomeInput>): Promise<IncomeRecord> {
  const res = await fetch(`/api/income/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<IncomeRecord> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update income record");
  return json.data!;
}

export async function clearIncomeRequest(id: string): Promise<IncomeRecord> {
  const res = await fetch(`/api/income/${id}`, { method: "PATCH" });
  const json: ApiResponse<IncomeRecord> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to mark income as cleared");
  return json.data!;
}
