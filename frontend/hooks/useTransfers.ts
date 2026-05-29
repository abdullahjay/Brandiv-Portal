"use client";

import { useState, useEffect, useCallback } from "react";
import type { TransferRecord, ApiResponse } from "@frontend/types";

export function useTransfers(period: string) {
  const [data, setData] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = period ? `/api/transfers?period=${period}` : "/api/transfers";
      const res = await fetch(url);
      const json: ApiResponse<TransferRecord[]> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load transfers");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

export async function createTransferRequest(input: {
  fromAccountId: string;
  toAccountId:   string;
  amountPkr:     number;
  description:   string;
  notes?:        string;
  transferAt?:   string;
}): Promise<TransferRecord> {
  const res = await fetch("/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json: ApiResponse<TransferRecord> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to create transfer");
  return json.data!;
}

export async function reverseTransferRequest(id: string): Promise<TransferRecord> {
  const res = await fetch(`/api/transfers/${id}/reverse`, { method: "POST" });
  const json: ApiResponse<TransferRecord> = await res.json();
  if (!json.success) throw new Error(json.message ?? "Failed to reverse transfer");
  return json.data!;
}
