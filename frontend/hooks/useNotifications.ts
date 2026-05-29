"use client";

// Thin re-export — the actual state lives in NotificationsContext so it
// persists across page navigations without re-fetching each time.
export { useNotificationsContext as useNotifications } from "@frontend/context/NotificationsContext";
