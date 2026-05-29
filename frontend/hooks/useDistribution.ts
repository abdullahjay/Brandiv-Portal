"use client";

import { useState, useEffect, useCallback } from "react";
import type { DistributionPreview, DistributionRecord, ApiResponse } from "@frontend/types";

export function useDistributionPreview() {
  const [data, setData] = useState<DistributionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/distribution/preview");
      const json: ApiResponse<DistributionPreview> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load preview");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export function useDistributions() {
  const [data, setData] = useState<DistributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/distribution");
      const json: ApiResponse<DistributionRecord[]> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load distributions");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, error, refetch: fetch_ };
}

export async function runDistributionRequest(label?: string, notes?: string): Promise<DistributionRecord> {
  const res = await fetch("/api/distribution/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: label || null, notes: notes || null }),
  });
  const json: ApiResponse<DistributionRecord> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to run distribution");
  return json.data!;
}
