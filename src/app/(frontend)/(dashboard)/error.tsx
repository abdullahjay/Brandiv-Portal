"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 40,
        background: "var(--bg2)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--red-bg, #fee2e2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i className="ti ti-alert-triangle" style={{ fontSize: 22, color: "var(--red, #dc2626)" }} />
      </div>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)", marginBottom: 6 }}>
          Something went wrong
        </div>
        <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6, margin: 0 }}>
          This page encountered an unexpected error. Your data is safe — try reloading.
        </p>
        {error.digest && (
          <p style={{ fontSize: 11, color: "var(--t3)", marginTop: 10, fontFamily: "monospace" }}>
            {error.digest}
          </p>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "7px 16px",
            border: "0.5px solid var(--b3)",
            background: "var(--bg1)",
            borderRadius: "var(--rm, 8px)",
            fontSize: 13,
            color: "var(--t1)",
            cursor: "pointer",
          }}
        >
          Reload page
        </button>
        <button
          onClick={reset}
          style={{
            padding: "7px 16px",
            background: "var(--blue, #1a56db)",
            border: "none",
            borderRadius: "var(--rm, 8px)",
            fontSize: 13,
            color: "#fff",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
