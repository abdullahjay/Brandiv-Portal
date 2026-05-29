"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "narrow" | "default" | "wide";
}

const WIDTH_MAP = { narrow: 400, default: 520, wide: 640 };

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "default",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--bg1)",
          borderRadius: "var(--rl)",
          border: "0.5px solid var(--b3)",
          width: "100%",
          maxWidth: WIDTH_MAP[width],
          maxHeight: "88vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--b3)",
            position: "sticky",
            top: 0,
            background: "var(--bg1)",
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--rm)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--t2)",
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, flex: 1 }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "0.5px solid var(--b3)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              position: "sticky",
              bottom: 0,
              background: "var(--bg1)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
