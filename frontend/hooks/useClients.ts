"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { clientsQueryKey, fetchClients } from "@frontend/lib/queries/listQueries";
import { invalidateClients, refreshAfter } from "@frontend/lib/invalidateQueries";
import { apiFetch } from "@frontend/lib/apiFetch";
import type { Client } from "@frontend/types";

interface UseClientsOptions {
  status?: "active" | "pending" | "inactive" | "all";
  search?: string;
  page?: number;
}

export function useClients(options: UseClientsOptions = {}) {
  const { status = "all", search = "", page = 1 } = options;

  const query = useQuery({
    queryKey: clientsQueryKey({ status, search, page }),
    queryFn: () => fetchClients({ status, search, page }),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export function useClient(id: string | null) {
  const query = useQuery({
    queryKey: ["clients", id],
    queryFn: () => apiFetch<Client>(`/api/clients/${id}`),
    enabled: !!id,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createClientRequest(body: Partial<Client>): Promise<Client> {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create client");
  refreshAfter(invalidateClients());
  return json.data!;
}

export async function updateClientRequest(id: string, body: Partial<Client>): Promise<Client> {
  const res = await fetch(`/api/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update client");
  refreshAfter(invalidateClients(id));
  return json.data!;
}

export async function archiveClientRequest(id: string): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to archive client");
  refreshAfter(invalidateClients(id));
}
