"use client";

import { useState, useEffect, useCallback } from "react";
import type { PnLStatement, CashFlowStatement, AccountStatement, ApiResponse } from "@frontend/types";

export function usePnL(period: string) {
  const [data, setData] = useState<PnLStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/statements/pl?period=${period}`);
      const json: ApiResponse<PnLStatement> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load P&L");
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

export function useCashFlow(period: string) {
  const [data, setData] = useState<CashFlowStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!period) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/statements/cashflow?period=${period}`);
      const json: ApiResponse<CashFlowStatement> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load cash flow");
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

export function useAccountStatement(accountId: string | null, period: string) {
  const [data, setData] = useState<AccountStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const url = period
        ? `/api/accounts/${accountId}/statement?period=${period}`
        : `/api/accounts/${accountId}/statement`;
      const res = await fetch(url);
      const json: ApiResponse<AccountStatement> = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load statement");
      setData(json.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [accountId, period]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}
