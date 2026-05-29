"use client";

import { useState, useEffect, useCallback } from "react";
import type { Invoice, ApiResponse, PaginatedResponse, CreateInvoiceInput } from "@frontend/types";

interface UseInvoicesOptions {
  status?: "all" | "draft" | "sent" | "paid" | "overdue" | "cancelled";
  clientId?: string;
  projectId?: string;
  search?: string;
  page?: number;
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  const { status = "all", clientId, projectId, search = "", page = 1 } = options;

  const [data, setData] = useState<PaginatedResponse<Invoice> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        ...(search && { search }),
        ...(clientId && { clientId }),
        ...(projectId && { projectId }),
      });
      const res = await fetch(`/api/invoices?${params}`);
      const json: ApiResponse<PaginatedResponse<Invoice>> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to fetch invoices");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [status, clientId, projectId, search, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return { data, loading, error, refetch: fetchInvoices };
}

export function useInvoice(id: string | null) {
  const [data, setData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) { setData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const json: ApiResponse<Invoice> = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  return { data, loading, error, refetch: fetchInvoice };
}

export async function createInvoiceRequest(body: CreateInvoiceInput): Promise<Invoice> {
  const res = await fetch("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<Invoice> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create invoice");
  return json.data!;
}

export async function updateInvoiceRequest(id: string, body: Partial<CreateInvoiceInput>): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: ApiResponse<Invoice> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to update invoice");
  return json.data!;
}

export async function sendInvoiceRequest(id: string): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
  const json: ApiResponse<Invoice> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to send invoice");
  return json.data!;
}

export async function payInvoiceRequest(id: string): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}/pay`, { method: "POST" });
  const json: ApiResponse<Invoice> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to mark invoice as paid");
  return json.data!;
}

export async function cancelInvoiceRequest(id: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to cancel invoice");
}
