import { useState, useEffect, useCallback } from "react";
import type { TeamUser, ApiResponse, PaginatedResponse } from "@frontend/types";

export function useUsers(page = 1, pageSize = 50, search = "", role = "", status = "") {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      if (status) params.set("status", status);

      const res = await fetch(`/api/users?${params}`);
      const json: ApiResponse<PaginatedResponse<TeamUser>> = await res.json();
      if (json.success && json.data) {
        setUsers(json.data.items);
        setTotal(json.data.total);
      } else {
        setError(json.message ?? "Failed to load users");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, role, status]);

  useEffect(() => { load(); }, [load]);

  return { users, total, loading, error, refresh: load };
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
  const json: ApiResponse<TeamUser> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create user");
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
  const json: ApiResponse<TeamUser> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update user");
  return json.data!;
}

export async function deactivateUserRequest(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to deactivate user");
}

export async function reactivateUserRequest(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}?reactivate=1`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to reactivate user");
}

export async function deleteUserRequest(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}?permanent=1`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete user");
}
