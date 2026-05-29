"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimeEntry, ApiResponse, PaginatedResponse } from "@frontend/types";

export interface TimeEntryFilters {
  period?: string;
  projectId?: string;
  userId?: string;
  billable?: boolean;
  page?: number;
  pageSize?: number;
}

export function useTimeEntries(filters: TimeEntryFilters) {
  const [data, setData] = useState<PaginatedResponse<TimeEntry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.period) params.set("period", filters.period);
      if (filters.projectId) params.set("projectId", filters.projectId);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.billable !== undefined) params.set("billable", String(filters.billable));
      if (filters.page) params.set("page", String(filters.page));
      if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

      const res = await fetch(`/api/time-entries?${params.toString()}`);
      const json: ApiResponse<PaginatedResponse<TimeEntry>> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load time entries");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filters.period, filters.projectId, filters.userId, filters.billable, filters.page, filters.pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function createTimeEntryRequest(data: {
  projectId: string;
  date: string;
  hours: number;
  description?: string | null;
  billable?: boolean;
}): Promise<TimeEntry> {
  const res = await fetch("/api/time-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json: ApiResponse<TimeEntry> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to log time");
  return json.data!;
}

export async function deleteTimeEntryRequest(id: string): Promise<void> {
  const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete time entry");
}
