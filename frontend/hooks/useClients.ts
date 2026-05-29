"use client";

import { useState, useEffect, useCallback } from "react";
import type { Client, ApiResponse, PaginatedResponse } from "@frontend/types";

interface UseClientsOptions {
  status?: "active" | "pending" | "inactive" | "all";
  search?: string;
  page?: number;
}

export function useClients(options: UseClientsOptions = {}) {
  const { status = "all", search = "", page = 1 } = options;

  const [data, setData] = useState<PaginatedResponse<Client> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        ...(search && { search }),
      });
      const res = await fetch(`/api/clients?${params}`);
      const json: ApiResponse<PaginatedResponse<Client>> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch clients");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  return { data, loading, error, refetch: fetchClients };
}

export function useClient(id: string | null) {
  const [data, setData] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    if (!id) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${id}`);
      const json: ApiResponse<Client> = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  return { data, loading, error, refetch: fetchClient };
}

export async function createClientRequest(body: Partial<Client>): Promise<Client> {
  const res = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<Client> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create client");
  return json.data!;
}

export async function updateClientRequest(id: string, body: Partial<Client>): Promise<Client> {
  const res = await fetch(`/api/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<Client> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update client");
  return json.data!;
}

export async function archiveClientRequest(id: string): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to archive client");
}
