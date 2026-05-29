"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, ApiResponse, PaginatedResponse, CreateProjectInput } from "@frontend/types";

interface UseProjectsOptions {
  status?: "active" | "pending" | "done" | "cancelled" | "all";
  type?: "one_time" | "recurring" | "milestone" | "all";
  clientId?: string;
  search?: string;
  page?: number;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { status = "all", type = "all", clientId, search = "", page = 1 } = options;

  const [data, setData] = useState<PaginatedResponse<Project> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        type,
        page: String(page),
        ...(search && { search }),
        ...(clientId && { clientId }),
      });
      const res = await fetch(`/api/projects?${params}`);
      const json: ApiResponse<PaginatedResponse<Project>> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch projects");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [status, type, clientId, search, page]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  return { data, loading, error, refetch: fetchProjects };
}

export function useProject(id: string | null, refreshKey = 0) {
  const [data, setData] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`);
      const json: ApiResponse<Project> = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id, refreshKey]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  return { data, loading, error, refetch: fetchProject };
}

export async function createProjectRequest(body: CreateProjectInput): Promise<Project> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<Project> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create project");
  return json.data!;
}

export async function updateProjectRequest(id: string, body: Partial<CreateProjectInput>): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<Project> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update project");
  return json.data!;
}

export async function archiveProjectRequest(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to archive project");
}
