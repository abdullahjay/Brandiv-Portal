"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { invoicesQueryKey, fetchInvoices } from "@frontend/lib/queries/listQueries";
import {
  invalidateCommissions,
  invalidateDashboard,
  invalidateFinancialData,
  invalidateIncome,
  invalidateInvoices,
  refreshAfter,
} from "@frontend/lib/invalidateQueries";
import { apiFetch } from "@frontend/lib/apiFetch";
import type { Invoice, CreateInvoiceInput } from "@frontend/types";

interface UseInvoicesOptions {
  status?: "all" | "draft" | "sent" | "paid" | "overdue" | "cancelled";
  clientId?: string;
  projectId?: string;
  search?: string;
  page?: number;
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  const { status = "all", clientId, projectId, search = "", page = 1 } = options;

  const query = useQuery({
    queryKey: invoicesQueryKey({ status, clientId, projectId, search, page }),
    queryFn: () => fetchInvoices({ status, clientId, projectId, search, page }),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export function useInvoice(id: string | null) {
  const query = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => apiFetch<Invoice>(`/api/invoices/${id}`),
    enabled: !!id,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function createInvoiceRequest(body: CreateInvoiceInput): Promise<Invoice> {
  const res = await fetch("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create invoice");
  refreshAfter(invalidateInvoices(), invalidateDashboard());
  return json.data!;
}

export async function updateInvoiceRequest(id: string, body: Partial<CreateInvoiceInput>): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update invoice");
  refreshAfter(invalidateInvoices(id));
  return json.data!;
}

export async function sendInvoiceRequest(id: string): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to send invoice");
  refreshAfter(invalidateInvoices(id));
  return json.data!;
}

export async function payInvoiceRequest(id: string): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}/pay`, { method: "POST" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to mark invoice as paid");
  refreshAfter(invalidateInvoices(id), invalidateIncome(), invalidateFinancialData(), invalidateCommissions());
  return json.data!;
}

export async function cancelInvoiceRequest(id: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to cancel invoice");
  refreshAfter(invalidateInvoices(id));
}
