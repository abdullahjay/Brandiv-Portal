"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { compensationQueryKey, fetchCompensation } from "@frontend/lib/queries/listQueries";

export function useCompensation() {
  const query = useQuery({
    queryKey: compensationQueryKey(),
    queryFn: fetchCompensation,
    placeholderData: keepPreviousData,
  });

  return {
    employees: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refresh: () => void query.refetch(),
  };
}
