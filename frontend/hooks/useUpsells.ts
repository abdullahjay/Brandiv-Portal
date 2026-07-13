"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectUpsell, CreateUpsellInput, ApiResponse } from "@frontend/types";

export function useUpsells(projectId: string | null) {
  const [data, setData] = useState<ProjectUpsell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpsells = useCallback(async () => {
    if (!projectId) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/upsells`);
      const json: ApiResponse<ProjectUpsell[]> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch upsells");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchUpsells(); }, [fetchUpsells]);

  return { data, loading, error, refetch: fetchUpsells };
}

export async function createUpsellRequest(projectId: string, body: CreateUpsellInput): Promise<ProjectUpsell> {
  const res = await fetch(`/api/projects/${projectId}/upsells`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<ProjectUpsell> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create upsell");
  return json.data!;
}

export async function updateUpsellRequest(projectId: string, upsellId: string, body: Partial<CreateUpsellInput>): Promise<ProjectUpsell> {
  const res = await fetch(`/api/projects/${projectId}/upsells/${upsellId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<ProjectUpsell> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update upsell");
  return json.data!;
}

export async function deleteUpsellRequest(projectId: string, upsellId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/upsells/${upsellId}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete upsell");
}

export async function approveUpsellRequest(projectId: string, upsellId: string): Promise<{ upsell: ProjectUpsell }> {
  const res = await fetch(`/api/projects/${projectId}/upsells/${upsellId}/approve`, { method: "POST" });
  const json: ApiResponse<{ upsell: ProjectUpsell }> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to approve upsell");
  return json.data!;
}
