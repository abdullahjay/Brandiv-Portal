"use client";

import Topbar from "@frontend/components/layout/Topbar";

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: string;
}

export default function ComingSoon({
  title,
  description,
  icon = "ti-hammer",
}: ComingSoonProps) {
  return (
    <>
      <Topbar title={title} />
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 14,
          padding: 40,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--bg2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i className={`ti ${icon}`} style={{ fontSize: 26, color: "var(--t3)" }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--t2)", textAlign: "center", maxWidth: 340 }}>
          {description ?? "This module is coming soon. Check back after the next build."}
        </div>
        <span
          style={{
            marginTop: 4,
            fontSize: 11,
            fontWeight: 500,
            background: "var(--blue-bg)",
            color: "var(--blue)",
            padding: "3px 10px",
            borderRadius: 20,
          }}
        >
          In progress
        </span>
      </div>
    </>
  );
}
