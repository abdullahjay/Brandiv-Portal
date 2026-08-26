"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  fetchTimeEntries,
  timeEntriesQueryKey,
  type TimeEntriesQueryParams,
} from "@frontend/lib/queries/listQueries";
import { invalidateTimeEntries, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { TimeEntry } from "@frontend/types";

export type TimeEntryFilters = TimeEntriesQueryParams;

export function useTimeEntries(filters: TimeEntryFilters) {
  const query = useQuery({
    queryKey: timeEntriesQueryKey(filters),
    queryFn: () => fetchTimeEntries(filters),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
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
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to log time");
  refreshAfter(invalidateTimeEntries());
  return json.data!;
}

export async function deleteTimeEntryRequest(id: string): Promise<void> {
  const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to delete time entry");
  refreshAfter(invalidateTimeEntries());
}
