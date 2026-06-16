export default function OfflinePage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      background: "var(--bg1, #f0efeb)",
      padding: 24,
      textAlign: "center",
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: "#185FA5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 36,
        fontWeight: 700,
        color: "white",
        fontFamily: "Arial, sans-serif",
        marginBottom: 8,
      }}>
        B
      </div>

      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--t1, #1a1a18)" }}>
        You&apos;re offline
      </div>
      <div style={{ fontSize: 14, color: "var(--t3, #888)", maxWidth: 320, lineHeight: 1.5 }}>
        No internet connection. Check your network and try again — your last-viewed pages are still available.
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          height: 38,
          padding: "0 20px",
          borderRadius: 8,
          background: "#185FA5",
          color: "white",
          border: "none",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Try again
      </button>
    </div>
  );
}
