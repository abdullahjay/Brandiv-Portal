"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@frontend/context/ThemeContext";
import { useNotificationsContext as useNotifications } from "@frontend/context/NotificationsContext";
import NotificationPanel from "./NotificationPanel";

interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, actions }: TopbarProps) {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { items, unreadCount, loading, markRead, markAllRead, dismiss } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div
      style={{
        background: "var(--bg1)",
        borderBottom: "0.5px solid var(--b3)",
        padding: "0 24px",
        height: 52,
        minHeight: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)", letterSpacing: "-0.01em" }}>
        {title}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {actions}

        {/* Notifications bell */}
        <div style={{ position: "relative" }}>
          <button
            className="ib"
            title="Notifications"
            onClick={() => setShowPanel((v) => !v)}
            style={{ position: "relative" }}
          >
            <i className="ti ti-bell" style={{ fontSize: 15 }} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  minWidth: unreadCount > 9 ? 16 : 14,
                  height: unreadCount > 9 ? 14 : 14,
                  borderRadius: 10,
                  background: "#E24B4A",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  pointerEvents: "none",
                  lineHeight: 1,
                  border: "1.5px solid var(--bg1)",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showPanel && (
            <NotificationPanel
              items={items}
              unreadCount={unreadCount}
              loading={loading}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              onDismiss={dismiss}
              onClose={() => setShowPanel(false)}
            />
          )}
        </div>

        {/* Dark / light mode toggle */}
        <button
          className="ib"
          onClick={toggleTheme}
          title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <i
            className={`ti ${resolvedTheme === "dark" ? "ti-sun" : "ti-moon"}`}
            style={{ fontSize: 15 }}
          />
        </button>

        {/* Settings */}
        <button
          className="ib"
          title="Settings"
          onClick={() => router.push("/settings")}
        >
          <i className="ti ti-settings" style={{ fontSize: 15 }} />
        </button>
      </div>
    </div>
  );
}
