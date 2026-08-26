"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchUsers, usersQueryKey } from "@frontend/lib/queries/listQueries";
import { invalidateUsers, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { TeamUser } from "@frontend/types";

export function useUsers(page = 1, pageSize = 50, search = "", role = "", status = "") {
  const query = useQuery({
    queryKey: usersQueryKey({ page, pageSize, search, role, status }),
    queryFn: () => fetchUsers({ page, pageSize, search, role, status }),
    placeholderData: keepPreviousData,
  });

  return {
    users: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refresh: () => void query.refetch(),
  };
}

export async function createUserRequest(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<TeamUser> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create user");
  refreshAfter(invalidateUsers());
  return json.data!;
}

export async function updateUserRequest(
  id: string,
  data: { name?: string; email?: string; password?: string; role?: string; status?: string }
): Promise<TeamUser> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update user");
  refreshAfter(invalidateUsers());
  return json.data!;
}

export async function deactivateUserRequest(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to deactivate user");
  refreshAfter(invalidateUsers());
}

export async function reactivateUserRequest(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}?reactivate=1`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to reactivate user");
  refreshAfter(invalidateUsers());
}

export async function deleteUserRequest(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}?permanent=1`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete user");
  refreshAfter(invalidateUsers());
}
