"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { projectsQueryKey, fetchProjects } from "@frontend/lib/queries/listQueries";
import { invalidateProjects, refreshAfter } from "@frontend/lib/invalidateQueries";
import { apiFetch } from "@frontend/lib/apiFetch";
import type { Project, CreateProjectInput } from "@frontend/types";

interface UseProjectsOptions {
  status?: "active" | "pending" | "done" | "cancelled" | "all";
  type?: "one_time" | "recurring" | "milestone" | "all";
  clientId?: string;
  search?: string;
  page?: number;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { status = "all", type = "all", clientId, search = "", page = 1 } = options;

  const query = useQuery({
    queryKey: projectsQueryKey({ status, type, clientId, search, page }),
    queryFn: () => fetchProjects({ status, type, clientId, search, page }),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export function useProject(id: string | null, refreshKey = 0) {
  const query = useQuery({
    queryKey: ["projects", id, refreshKey],
    queryFn: () => apiFetch<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createProjectRequest(body: CreateProjectInput): Promise<Project> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create project");
  refreshAfter(invalidateProjects());
  return json.data!;
}

export async function updateProjectRequest(id: string, body: Partial<CreateProjectInput>): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update project");
  refreshAfter(invalidateProjects(id));
  return json.data!;
}

export async function archiveProjectRequest(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to archive project");
  refreshAfter(invalidateProjects(id));
}
