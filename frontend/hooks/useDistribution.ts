"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  distributionPreviewQueryKey,
  distributionsQueryKey,
  fetchDistributionPreview,
  fetchDistributions,
} from "@frontend/lib/queries/listQueries";
import { invalidateDistribution, refreshAfter } from "@frontend/lib/invalidateQueries";
import type { DistributionRecord } from "@frontend/types";

export function useDistributionPreview() {
  const query = useQuery({
    queryKey: distributionPreviewQueryKey(),
    queryFn: fetchDistributionPreview,
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export function useDistributions() {
  const query = useQuery({
    queryKey: distributionsQueryKey(),
    queryFn: fetchDistributions,
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () => void query.refetch(),
  };
}

export async function runDistributionRequest(label?: string, notes?: string): Promise<DistributionRecord> {
  const res = await fetch("/api/distribution/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label || null, notes: notes || null }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to run distribution");
  refreshAfter(invalidateDistribution());
  return json.data!;
}
