interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

export default function MetricCard({ label, value, sub, trend }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: "var(--t1)" }}>{value}</div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            marginTop: 3,
            color:
              trend === "up"
                ? "var(--green)"
                : trend === "down"
                ? "var(--red)"
                : "var(--t2)",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
