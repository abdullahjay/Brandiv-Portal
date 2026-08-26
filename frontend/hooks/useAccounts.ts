"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { accountsQueryKey, fetchAccounts } from "@frontend/lib/queries/listQueries";
import { invalidateAccounts, invalidateDistribution, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { CreateAccountInput, CrmAccount } from "@frontend/types";

export function useAccounts(type?: "operating" | "company_reserve" | "stakeholder" | "all") {
  const query = useQuery({
    queryKey: accountsQueryKey(type ?? "all"),
    queryFn: () => fetchAccounts(type),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createAccountRequest(body: CreateAccountInput): Promise<CrmAccount> {
  const res = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create account");
  refreshAfter(invalidateAccounts(), invalidateDistribution());
  return json.data!;
}

export async function updateAccountRequest(id: string, body: Partial<CreateAccountInput> & { currentBalancePkr?: number }): Promise<CrmAccount> {
  const res = await fetch(`/api/accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update account");
  refreshAfter(invalidateAccounts(), invalidateDistribution());
  return json.data!;
}

export async function deleteAccountRequest(id: string): Promise<void> {
  const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete account");
  refreshAfter(invalidateAccounts(), invalidateDistribution());
}
