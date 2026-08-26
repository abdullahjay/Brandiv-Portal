"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@frontend/lib/apiFetch";
import { invalidateUpsells, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { ProjectUpsell, PaginatedResponse, CreateUpsellInput } from "@frontend/types";

export function useUpsells(projectId: string | null, status: string = "all", refreshKey = 0) {
  const query = useQuery({
    queryKey: ["upsells", projectId, status, refreshKey],
    queryFn: async () => {
      const params = new URLSearchParams({ status, pageSize: "100" });
      return apiFetch<PaginatedResponse<ProjectUpsell>>(
        `/api/projects/${projectId}/upsells?${params}`
      );
    },
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createUpsellRequest(projectId: string, body: CreateUpsellInput): Promise<ProjectUpsell> {
  const res = await fetch(`/api/projects/${projectId}/upsells`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create upsell");
  refreshAfter(invalidateUpsells(projectId));
  return json.data!;
}

export async function updateUpsellRequest(projectId: string, upsellId: string, body: Partial<CreateUpsellInput>): Promise<ProjectUpsell> {
  const res = await fetch(`/api/projects/${projectId}/upsells/${upsellId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update upsell");
  refreshAfter(invalidateUpsells(projectId));
  return json.data!;
}

export async function deleteUpsellRequest(projectId: string, upsellId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/upsells/${upsellId}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete upsell");
  refreshAfter(invalidateUpsells(projectId));
}

export async function approveUpsellRequest(projectId: string, upsellId: string): Promise<ProjectUpsell> {
  const res = await fetch(`/api/projects/${projectId}/upsells/${upsellId}/approve`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to approve upsell");
  refreshAfter(invalidateUpsells(projectId));
  return json.data!;
}

export async function cancelUpsellRequest(projectId: string, upsellId: string): Promise<ProjectUpsell> {
  const res = await fetch(`/api/projects/${projectId}/upsells/${upsellId}/cancel`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to cancel upsell");
  refreshAfter(invalidateUpsells(projectId));
  return json.data!;
}

export async function completeUpsellRequest(projectId: string, upsellId: string): Promise<ProjectUpsell> {
  const res = await fetch(`/api/projects/${projectId}/upsells/${upsellId}/complete`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to complete upsell");
  refreshAfter(invalidateUpsells(projectId));
  return json.data!;
}
