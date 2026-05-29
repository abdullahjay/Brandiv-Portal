"use client";

import { useState, useEffect, useCallback } from "react";
import type { CrmAccount, ApiResponse, CreateAccountInput } from "@frontend/types";

export function useAccounts(type?: "operating" | "company_reserve" | "stakeholder" | "all") {
  const [data, setData] = useState<CrmAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(type && type !== "all" ? { type } : {});
      const res = await fetch(`/api/accounts?${params}`);
      const json: ApiResponse<CrmAccount[]> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch accounts");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  return { data, loading, error, refetch: fetchAccounts };
}

export async function createAccountRequest(body: CreateAccountInput): Promise<CrmAccount> {
  const res = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<CrmAccount> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create account");
  return json.data!;
}

export async function updateAccountRequest(id: string, body: Partial<CreateAccountInput>): Promise<CrmAccount> {
  const res = await fetch(`/api/accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<CrmAccount> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update account");
  return json.data!;
}

export async function deleteAccountRequest(id: string): Promise<void> {
  const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete account");
}
