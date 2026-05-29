"use client";

import { usePnL } from "@frontend/hooks/useStatements";

function fmt(n: number) {
  return Math.abs(n / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Row({ label, value, color, bold, indent, note }: {
  label: string;
  value: number;
  color?: string;
  bold?: boolean;
  indent?: boolean;
  note?: string;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 20px",
      borderBottom: "0.5px solid var(--b3)",
    }}>
      <div style={{ paddingLeft: indent ? 16 : 0 }}>
        <span style={{ fontSize: 13, fontWeight: bold ? 600 : 400, color: bold ? "var(--t1)" : "var(--t2)" }}>
          {label}
        </span>
        {note && <span style={{ fontSize: 11, color: "var(--t3)", marginLeft: 8 }}>{note}</span>}
      </div>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: color ?? "var(--t1)" }}>
        {value < 0 ? "−" : ""}PKR {fmt(value)}
      </span>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{ padding: "10px 20px 6px", background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12 }} />
        {title}
      </div>
    </div>
  );
}

interface Props {
  period: string;
}

export default function PLStatement({ period }: Props) {
  const { data, loading, error } = usePnL(period);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 12 }}>
        <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading P&L…
      </div>
    );
  }

  if (error) return <div style={{ padding: 24, fontSize: 12, color: "var(--red)" }}>{error}</div>;
  if (!data) return null;

  const totalDeductions = data.totalExpensesPkr + data.totalPayrollPkr + data.totalCommissionPkr;

  return (
    <div>
      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Gross Revenue", value: data.totalGrossPkr, color: "var(--t1)" },
          { label: "Net Income", value: data.totalIncomePkr, color: "var(--green)" },
          { label: "Total Deductions", value: totalDeductions, color: "var(--red)" },
          { label: "Net Profit", value: data.netProfitPkr, color: data.netProfitPkr >= 0 ? "var(--blue)" : "var(--red)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>PKR {fmt(value)}</div>
            {label === "Net Profit" && (
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 3 }}>
                {data.grossMarginPct.toFixed(1)}% margin
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Distribution status banner */}
      {data.isDistributed && data.distributionRunAt && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rm)", marginBottom: 16, fontSize: 12, color: "var(--green)" }}>
          <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
          Period distributed on {fmtDate(data.distributionRunAt)} · PKR {fmt(data.distributedPkr!)} paid out
        </div>
      )}

      {data.pendingCommissionsCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--amber-bg)", border: "0.5px solid #f59e0b", borderRadius: "var(--rm)", marginBottom: 16, fontSize: 12, color: "#92400e" }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} />
          {data.pendingCommissionsCount} commission{data.pendingCommissionsCount > 1 ? "s" : ""} pending approval — not included in net profit calculation
        </div>
      )}

      {/* Statement table */}
      <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>

        {/* Revenue */}
        <SectionHeader title="Revenue" icon="ti-trending-up" />
        <Row label="Gross receipts" value={data.totalGrossPkr} indent />
        {data.totalWhtPkr > 0 && (
          <Row label="Less: WHT deducted at source" value={-data.totalWhtPkr} color="var(--red)" indent />
        )}
        <Row label="Net revenue" value={data.totalIncomePkr} bold />

        {/* Revenue by client */}
        {data.incomeByClient.length > 0 && (
          <>
            <div style={{ padding: "6px 20px 4px 36px", background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
              <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue breakdown</span>
            </div>
            {data.incomeByClient.map((c) => (
              <div key={c.clientName} style={{ display: "flex", justifyContent: "space-between", padding: "7px 20px 7px 36px", borderBottom: "0.5px solid var(--b3)" }}>
                <span style={{ fontSize: 12, color: "var(--t2)" }}>{c.clientName}</span>
                <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 500 }}>PKR {fmt(c.amountPkr)}</span>
              </div>
            ))}
          </>
        )}

        {/* Operating expenses */}
        <SectionHeader title="Operating Expenses" icon="ti-arrow-up-right" />
        <Row label="Direct expenses" value={data.totalExpensesPkr} color="var(--red)" indent />
        <Row label="Payroll" value={data.totalPayrollPkr} color="var(--red)" indent />
        <Row label="Commissions (approved/paid)" value={data.totalCommissionPkr} color="var(--red)" indent note={data.pendingCommissionsCount > 0 ? `${data.pendingCommissionsCount} pending excluded` : undefined} />
        <Row label="Total deductions" value={totalDeductions} bold color="var(--red)" />

        {/* Expense breakdown */}
        {data.expenseByCategory.length > 0 && (
          <>
            <div style={{ padding: "6px 20px 4px 36px", background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
              <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Expenses by category</span>
            </div>
            {data.expenseByCategory.map((e) => (
              <div key={e.category} style={{ display: "flex", justifyContent: "space-between", padding: "7px 20px 7px 36px", borderBottom: "0.5px solid var(--b3)" }}>
                <span style={{ fontSize: 12, color: "var(--t2)" }}>{e.category}</span>
                <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 500 }}>PKR {fmt(e.amountPkr)}</span>
              </div>
            ))}
          </>
        )}

        {/* Payroll breakdown */}
        {data.payrollByEmployee.length > 0 && (
          <>
            <div style={{ padding: "6px 20px 4px 36px", background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
              <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Payroll by employee</span>
            </div>
            {data.payrollByEmployee.map((p) => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 20px 7px 36px", borderBottom: "0.5px solid var(--b3)" }}>
                <div>
                  <span style={{ fontSize: 12, color: "var(--t2)" }}>{p.name}</span>
                  {p.deductions > 0 && (
                    <span style={{ fontSize: 11, color: "var(--t3)", marginLeft: 8 }}>gross PKR {fmt(p.grossPkr)} − deductions PKR {fmt(p.deductions)}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, background: p.status === "paid" ? "var(--green-bg)" : "var(--amber-bg)", color: p.status === "paid" ? "var(--green)" : "#92400e", padding: "1px 6px", borderRadius: 10, fontWeight: 500 }}>{p.status}</span>
                  <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 500 }}>PKR {fmt(p.netPkr)}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Commission breakdown */}
        {data.commissionByStakeholder.length > 0 && (
          <>
            <div style={{ padding: "6px 20px 4px 36px", background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
              <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Commissions by stakeholder</span>
            </div>
            {data.commissionByStakeholder.map((c) => (
              <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 20px 7px 36px", borderBottom: "0.5px solid var(--b3)" }}>
                <span style={{ fontSize: 12, color: "var(--t2)" }}>{c.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, background: c.status === "paid" ? "var(--green-bg)" : c.status === "approved" ? "var(--blue-bg)" : "var(--amber-bg)", color: c.status === "paid" ? "var(--green)" : c.status === "approved" ? "var(--blue)" : "#92400e", padding: "1px 6px", borderRadius: 10, fontWeight: 500 }}>{c.status}</span>
                  <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 500 }}>PKR {fmt(c.amountPkr)}</span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Net profit */}
        <SectionHeader title="Bottom Line" icon="ti-chart-bar" />
        <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>Net Profit / (Loss)</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: data.netProfitPkr >= 0 ? "var(--blue)" : "var(--red)" }}>
            {data.netProfitPkr < 0 ? "−" : ""}PKR {fmt(data.netProfitPkr)}
          </span>
        </div>
        <div style={{ padding: "0 20px 14px", display: "flex", gap: 20 }}>
          <span style={{ fontSize: 12, color: "var(--t3)" }}>Margin: {data.grossMarginPct.toFixed(1)}%</span>
          {data.totalWhtPkr > 0 && (
            <span style={{ fontSize: 12, color: "var(--t3)" }}>WHT withheld: PKR {fmt(data.totalWhtPkr)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
