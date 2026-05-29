"use client";

import { useCashFlow } from "@frontend/hooks/useStatements";
import type { CashFlowOutflow } from "@frontend/types";

function fmt(n: number) {
  return Math.abs(n / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const OUTFLOW_CONFIG: Record<CashFlowOutflow["type"], { icon: string; color: string; bg: string }> = {
  expense:      { icon: "ti-receipt",      color: "var(--red)",   bg: "var(--red-bg)"  },
  payroll:      { icon: "ti-user-dollar",  color: "#f59e0b",      bg: "#fffbeb"        },
  distribution: { icon: "ti-arrows-split", color: "#6D28D9",      bg: "#EDE9FE"        },
};

interface Props {
  period: string;
}

export default function CashFlowStatement({ period }: Props) {
  const { data, loading, error } = useCashFlow(period);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 12 }}>
        <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading cash flow…
      </div>
    );
  }

  if (error) return <div style={{ padding: 24, fontSize: 12, color: "var(--red)" }}>{error}</div>;
  if (!data) return null;

  return (
    <div>
      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Cash inflows", value: data.totalInflowPkr, color: "var(--green)" },
          { label: "Cash outflows", value: data.totalOutflowPkr, color: "var(--red)" },
          { label: "Net cash flow", value: data.netCashFlowPkr, color: data.netCashFlowPkr >= 0 ? "var(--blue)" : "var(--red)" },
          { label: data.operatingAccountName ?? "Operating balance", value: data.operatingBalancePkr ?? 0, color: "var(--t1)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>
              {label === "Net cash flow" && value < 0 ? "−" : ""}PKR {fmt(value)}
            </div>
            {label !== "Net cash flow" && label !== (data.operatingAccountName ?? "Operating balance") && (
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 3 }}>
                {label === "Cash inflows" ? `${data.inflows.length} payment${data.inflows.length !== 1 ? "s" : ""}` : `${data.outflows.length} transaction${data.outflows.length !== 1 ? "s" : ""}`}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Inflows */}
        <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "var(--green-bg)", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-arrow-down-left" style={{ fontSize: 14, color: "var(--green)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green)" }}>Cash Inflows</span>
            <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--green)" }}>PKR {fmt(data.totalInflowPkr)}</span>
          </div>

          {data.inflows.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>No inflows for {period}</div>
          ) : (
            data.inflows.map((r, idx) => (
              <div
                key={idx}
                style={{ padding: "10px 16px", borderBottom: idx < data.inflows.length - 1 ? "0.5px solid var(--b3)" : "none", display: "flex", alignItems: "center", gap: 10 }}
              >
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="ti ti-arrow-down-left" style={{ fontSize: 11, color: "var(--green)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.party}</div>
                  <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1 }}>
                    {fmtDate(r.date)}
                    {r.reference && ` · ${r.reference}`}
                    {r.description !== "Payment received" && ` · ${r.description}`}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--green)" }}>+PKR {fmt(r.amountPkr)}</div>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{r.status}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Outflows */}
        <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", background: "var(--red-bg)", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 8 }}>
            <i className="ti ti-arrow-up-right" style={{ fontSize: 14, color: "var(--red)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--red)" }}>Cash Outflows</span>
            <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--red)" }}>PKR {fmt(data.totalOutflowPkr)}</span>
          </div>

          {data.outflows.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>No outflows for {period}</div>
          ) : (
            data.outflows.map((r, idx) => {
              const cfg = OUTFLOW_CONFIG[r.type];
              return (
                <div
                  key={idx}
                  style={{ padding: "10px 16px", borderBottom: idx < data.outflows.length - 1 ? "0.5px solid var(--b3)" : "none", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className={`ti ${cfg.icon}`} style={{ fontSize: 11, color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
                    <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1 }}>
                      {fmtDate(r.date)}
                      {r.party && ` · ${r.party}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: cfg.color, flexShrink: 0 }}>
                    −PKR {fmt(r.amountPkr)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Net summary bar */}
      <div style={{ marginTop: 16, padding: "14px 20px", background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>Net cash flow for {period}</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: data.netCashFlowPkr >= 0 ? "var(--blue)" : "var(--red)" }}>
          {data.netCashFlowPkr < 0 ? "−" : "+"}PKR {fmt(Math.abs(data.netCashFlowPkr))}
        </span>
      </div>
    </div>
  );
}
