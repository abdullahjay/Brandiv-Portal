"use client";

interface TopbarProps {
  title: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, actions }: TopbarProps) {
  return (
    <div
      className="topbar"
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
      <div className="topbar-title" style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)", letterSpacing: "-0.01em" }}>
        {title}
      </div>

      {actions && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
