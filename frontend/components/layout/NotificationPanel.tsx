"use client";

import { useEffect, useRef } from "react";
import type { CrmNotification } from "@frontend/types";

interface NotificationPanelProps {
  items: CrmNotification[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  payment_received: { icon: "ti-cash",            color: "var(--green)",  bg: "var(--green-bg)"  },
  invoice_created:  { icon: "ti-file-invoice",    color: "var(--blue)",   bg: "var(--blue-bg)"   },
  invoice_overdue:  { icon: "ti-alert-circle",    color: "var(--red)",    bg: "var(--red-bg)"    },
  commission:       { icon: "ti-percentage",       color: "var(--blue)",   bg: "var(--blue-bg)"   },
  project:          { icon: "ti-briefcase",        color: "#d97706",       bg: "#fef3c7"          },
  payroll:          { icon: "ti-wallet",           color: "#d97706",       bg: "#fef3c7"          },
  system:           { icon: "ti-info-circle",      color: "var(--t2)",     bg: "var(--bg2)"       },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: "ti-bell", color: "var(--blue)", bg: "var(--blue-bg)" };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationPanel({
  items,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClose,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 360,
        background: "var(--bg1)",
        border: "0.5px solid var(--b3)",
        borderRadius: "var(--rl)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 200,
        overflow: "hidden",
        animation: "notif-enter 0.15s ease",
      }}
    >
      <style>{`
        @keyframes notif-enter {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px 10px",
          borderBottom: "0.5px solid var(--b3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>Notifications</span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: "var(--red)",
                color: "#fff",
                borderRadius: 10,
                padding: "1px 6px",
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              style={{
                fontSize: 11,
                color: "var(--blue)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 4px",
                borderRadius: 4,
                fontFamily: "inherit",
              }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--t3)",
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--t3)", fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 18, display: "block", marginBottom: 8 }} />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t2)" }}>
            <i className="ti ti-bell-off" style={{ fontSize: 28, color: "var(--t3)", display: "block", marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>All caught up!</div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>No notifications yet</div>
          </div>
        ) : (
          items.map((n) => {
            const cfg = getTypeConfig(n.type);
            return (
              <div
                key={n.id}
                onClick={() => !n.read && onMarkRead(n.id)}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "10px 14px",
                  borderBottom: "0.5px solid var(--b3)",
                  background: n.read ? "transparent" : "color-mix(in srgb, var(--blue) 4%, transparent)",
                  cursor: n.read ? "default" : "pointer",
                  transition: "background 0.1s",
                  position: "relative",
                }}
              >
                {/* Unread dot */}
                {!n.read && (
                  <div
                    style={{
                      position: "absolute",
                      left: 5,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "var(--blue)",
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: cfg.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 14, color: cfg.color }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: n.read ? "var(--t2)" : "var(--t1)",
                      fontWeight: n.read ? 400 : 500,
                      lineHeight: 1.4,
                      wordBreak: "break-word",
                    }}
                  >
                    {n.message}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 3 }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>

                {/* Dismiss */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                  title="Dismiss"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--t3)",
                    flexShrink: 0,
                    opacity: 0.6,
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 11 }} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div
          style={{
            padding: "8px 14px",
            borderTop: "0.5px solid var(--b3)",
            fontSize: 11,
            color: "var(--t3)",
            textAlign: "center",
            background: "var(--bg2)",
          }}
        >
          {items.length} notification{items.length !== 1 ? "s" : ""}
          {unreadCount > 0 ? ` · ${unreadCount} unread` : " · all read"}
        </div>
      )}
    </div>
  );
}
