"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { employeesQueryKey, fetchEmployees } from "@frontend/lib/queries/listQueries";
import { invalidateEmployees, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { Employee } from "@frontend/types";

export function useEmployees(search = "", status = "all", page = 1, pageSize = 50) {
  const query = useQuery({
    queryKey: employeesQueryKey({ search, status, page, pageSize }),
    queryFn: () => fetchEmployees({ search, status, page, pageSize }),
    placeholderData: keepPreviousData,
  });
  return {
    employees: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refresh: () => void query.refetch(),
  };
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
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create employee");
  refreshAfter(invalidateEmployees());
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
  defaultTaxPkr: number | null;
  status: "active" | "inactive";
  notes: string | null;
}>): Promise<Employee> {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update employee");
  refreshAfter(invalidateEmployees());
  return json.data!;
}

export async function deactivateEmployeeRequest(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to deactivate employee");
  refreshAfter(invalidateEmployees());
}

export async function reactivateEmployeeRequest(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}?reactivate=1`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to reactivate employee");
  refreshAfter(invalidateEmployees());
}

export async function deleteEmployeeRequest(id: string): Promise<void> {
  const res = await fetch(`/api/employees/${id}?permanent=1`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete employee");
  refreshAfter(invalidateEmployees());
}
