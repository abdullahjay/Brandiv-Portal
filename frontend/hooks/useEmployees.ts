import { useState, useEffect, useCallback } from "react";
import type { Employee, ApiResponse, PaginatedResponse } from "@frontend/types";

export function useEmployees(search = "", status = "all", page = 1, pageSize = 50) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);

      const res = await fetch(`/api/employees?${params}`);
      const json: ApiResponse<PaginatedResponse<Employee>> = await res.json();
      if (json.success && json.data) {
        setEmployees(json.data.items);
        setTotal(json.data.total);
      } else {
        setError(json.message ?? "Failed to load employees");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [search, status, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  return { employees, total, loading, error, refresh: load };
}

export async function createEmployeeRequest(data: {
  name: string;
  designation?: string;
  department?: string;
  email?: string;
  phone?: string;
  cnic?: string;
  joinDate?: string | null;
  baseSalary?: number | null;
  notes?: string;
}): Promise<Employee> {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<Employee> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create employee");
  return json.data!;
}

export async function updateEmployeeRequest(id: string, data: Partial<{
  name: string;
  designation: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  cnic: string | null;
  joinDate: string | null;
  baseSalary: number | null;
  status: "active" | "inactive";
  notes: string | null;
}>): Promise<Employee> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<Employee> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update employee");
  return json.data!;
}

export async function deactivateEmployeeRequest(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to deactivate employee");
}

export async function reactivateEmployeeRequest(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}?reactivate=1`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to reactivate employee");
}

export async function deleteEmployeeRequest(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}?permanent=1`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete employee");
}
