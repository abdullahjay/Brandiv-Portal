// Shown INSTANTLY by Next.js on every dashboard navigation,
// before the page JS has compiled or data has loaded.
// No "use client" needed — this is a server component.

function Bar({ w, h = 14 }: { w: number | string; h?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: 6, flexShrink: 0 }}
    />
  );
}

function Row() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderBottom: "0.5px solid var(--b3)",
      }}
    >
      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <Bar w="60%" />
        <Bar w="40%" h={11} />
      </div>
      <Bar w={48} h={20} />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg3)",
      }}
    >
      {/* ── Topbar skeleton ── */}
      <div
        style={{
          height: 52,
          minHeight: 52,
          background: "var(--bg1)",
          borderBottom: "0.5px solid var(--b3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexShrink: 0,
        }}
      >
        <Bar w={120} h={16} />
        <div style={{ display: "flex", gap: 8 }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
        </div>
      </div>

      {/* ── Two-panel body skeleton ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left list panel */}
        <div
          style={{
            width: 300,
            minWidth: 300,
            background: "var(--bg1)",
            borderRight: "0.5px solid var(--b3)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header row */}
          <div
            style={{
              padding: "13px 16px",
              borderBottom: "0.5px solid var(--b3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Bar w={90} />
            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 8 }} />
          </div>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, padding: "9px 16px", borderBottom: "0.5px solid var(--b3)" }}>
            <div className="skeleton" style={{ width: 38, height: 24, borderRadius: 20 }} />
            <div className="skeleton" style={{ width: 52, height: 24, borderRadius: 20 }} />
            <div className="skeleton" style={{ width: 48, height: 24, borderRadius: 20 }} />
          </div>
          {/* List rows */}
          {Array.from({ length: 9 }).map((_, i) => <Row key={i} />)}
        </div>

        {/* Right detail panel */}
        <div
          style={{
            flex: 1,
            background: "var(--bg1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Detail topbar */}
          <div
            style={{
              height: 56,
              borderBottom: "0.5px solid var(--b3)",
              padding: "0 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Bar w={140} />
              <Bar w={90} h={11} />
            </div>
          </div>

          {/* Metric cards */}
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />
              ))}
            </div>
            {/* Info grid */}
            <div className="skeleton" style={{ height: 20, width: 100, borderRadius: 6 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Bar w="40%" h={11} />
                  <Bar w="70%" />
                </div>
              ))}
            </div>
            {/* Wide bar */}
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              <Bar w="100%" h={40} />
              <Bar w="100%" h={40} />
              <Bar w="80%"  h={40} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
