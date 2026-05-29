"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { CrmNotification, NotificationsResponse, ApiResponse } from "@frontend/types";

const POLL_MS = 30_000;

interface NotificationsContextValue {
  items: CrmNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  items: [],
  unreadCount: 0,
  loading: false,
  markRead: () => {},
  markAllRead: () => {},
  dismiss: () => {},
});

export function useNotificationsContext() {
  return useContext(NotificationsContext);
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json: ApiResponse<NotificationsResponse> = await res.json();
      if (json.success && json.data) {
        setItems(json.data.items);
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      // ignore — polling should fail silently
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    fetch(`/api/notifications/${id}`, { method: "PUT" }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    fetch("/api/notifications", { method: "PUT" }).catch(() => {});
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n.id !== id);
    });
    fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, loading, markRead, markAllRead, dismiss }}>
      {children}
    </NotificationsContext.Provider>
  );
}
