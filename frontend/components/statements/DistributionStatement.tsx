"use client";

import { useState } from "react";
import { useDistributions } from "@frontend/hooks/useDistribution";
import type { DistributionRecord } from "@frontend/types";

function fmt(n: number) {
  return (Math.abs(n) / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function periodLabel(p: string) {
  if (!p) return p;
  return new Date(p + "-01").toLocaleString("default", { month: "long", year: "numeric" });
}

export function exportDistributionStatementCSV(dist: DistributionRecord) {
  const label = dist.label ?? periodLabel(dist.period);
  const rows: string[][] = [
    [`Distribution Statement — ${label}`],
    [`Run date: ${fmtDate(dist.runAt)}`],
    [],
    ["Account", "Share %", "Distribution (PKR)", "Commission (PKR)", "Total paid (PKR)"],
    ...dist.items.map((item) => [
      item.account.name,
      String(item.sharePct) + "%",
      String(Math.round(item.distributionAmountPkr / 100)),
      String(Math.round(item.commissionAmountPkr / 100)),
      String(Math.round(item.totalPkr / 100)),
    ]),
    [],
    ["Total distributed", "", "", "", String(Math.round(dist.totalDistributedPkr / 100))],
    ["Operating balance used", "", "", "", String(Math.round(dist.operatingBalancePkr / 100))],
    ["Operating balance after", "", "", "", "0"],
  ];
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `distribution-statement-${dist.period}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printDistributionStatement(dist: DistributionRecord) {
  const label = dist.label ?? periodLabel(dist.period);
  const totalPaid = dist.items.reduce((s, i) => s + i.totalPkr, 0);
  const rowsHtml = dist.items.map((item) => `
    <tr>
      <td>${item.account.name}</td>
      <td style="text-align:center;"><span class="badge">${item.sharePct}%</span></td>
      <td class="num blue">${fmt(item.distributionAmountPkr)}</td>
      <td class="num green">${item.commissionAmountPkr > 0 ? fmt(item.commissionAmountPkr) : "—"}</td>
      <td class="num bold">${fmt(item.totalPkr)}</td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Distribution Statement</title>
  <style>body{font-family:system-ui,sans-serif;font-size:12px;color:#1a1a18;padding:24px;}
  h2{font-size:16px;margin-bottom:4px;}p{font-size:11px;color:#666;margin-bottom:16px;}
  .layout{display:grid;grid-template-columns:1fr 2fr;gap:16px;margin-top:16px;}
  .card{background:#f5f5f3;border-radius:8px;padding:16px;}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:0.5px solid #e5e5e5;font-size:12px;}
  .lbl{color:#888;}.val{font-weight:500;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  thead tr{background:#f5f5f3;}th{text-align:left;padding:8px 12px;font-size:10px;color:#888;font-weight:500;}
  td{padding:9px 12px;border-bottom:0.5px solid #e5e5e5;}.num{text-align:right;}.bold{font-weight:600;}
  .green{color:#3B6D11;}.blue{color:#185FA5;}
  .badge{font-size:9px;padding:2px 6px;border-radius:20px;background:#E6F1FB;color:#185FA5;}
  .total-row{background:#f5f5f3;font-weight:600;}
  @media print{body{padding:0;}}</style></head><body>
  <h2>Distribution Statement — ${label}</h2>
  <p>Run date: ${fmtDate(dist.runAt)}${dist.notes ? " · " + dist.notes : ""}</p>
  <div class="layout">
    <div class="card">
      <div class="row"><span class="lbl">Period</span><span class="val">${periodLabel(dist.period)}</span></div>
      <div class="row"><span class="lbl">Operating balance used</span><span class="val">PKR ${fmt(dist.operatingBalancePkr)}</span></div>
      <div class="row"><span class="lbl">Total commissions</span><span class="val">PKR ${fmt(dist.totalCommissionPkr)}</span></div>
      <div class="row"><span class="lbl">Total distributed</span><span class="val blue">PKR ${fmt(dist.totalDistributedPkr)}</span></div>
      <div class="row"><span class="lbl">Operating balance after</span><span class="val">PKR 0</span></div>
    </div>
    <table>
      <thead><tr>
        <th>Account</th><th style="text-align:center;">Share</th>
        <th style="text-align:right;">Distribution</th><th style="text-align:right;">Commission</th>
        <th style="text-align:right;">Total paid</th>
      </tr></thead>
      <tbody>${rowsHtml}
        <tr class="total-row">
          <td colspan="4" style="padding:9px 12px;">Total distributed</td>
          <td class="num blue" style="padding:9px 12px;font-size:14px;">PKR ${fmt(totalPaid)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <script>window.onload=function(){window.print();window.close();}<\/script>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

interface DistributionStatementProps {
  onExportReady?: (handlers: { exportCSV: () => void; exportPDF: () => void }) => void;
}

export default function DistributionStatement({ onExportReady }: DistributionStatementProps) {
  const { data: distributions, loading, error } = useDistributions();
  const [selectedIdx, setSelectedIdx] = useState(0);

  const dist: DistributionRecord | null = distributions[selectedIdx] ?? null;

  if (onExportReady && dist) {
    onExportReady({
      exportCSV: () => exportDistributionStatementCSV(dist),
      exportPDF: () => printDistributionStatement(dist),
    });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 12 }}>
        <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading…
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: 24, fontSize: 12, color: "var(--red)" }}>{error}</div>;
  }

  if (distributions.length === 0) {
    return (
      <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: 48, textAlign: "center" }}>
        <i className="ti ti-arrows-split" style={{ fontSize: 32, color: "var(--t3)", display: "block", marginBottom: 8 }} />
        <div style={{ fontSize: 13, color: "var(--t2)" }}>No distributions have been run yet</div>
      </div>
    );
  }

  const totalPaid = dist ? dist.items.reduce((s, i) => s + i.totalPkr, 0) : 0;

  return (
    <div>
      {/* Distribution selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {distributions.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setSelectedIdx(i)}
            style={{
              height: 30,
              padding: "0 14px",
              borderRadius: "var(--rm)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              border: `0.5px solid ${i === selectedIdx ? "var(--blue)" : "var(--b2)"}`,
              background: i === selectedIdx ? "var(--blue-bg)" : "transparent",
              color: i === selectedIdx ? "var(--blue)" : "var(--t1)",
              transition: "all .1s",
            }}
          >
            {d.label ?? periodLabel(d.period)}
          </button>
        ))}
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "var(--green-bg)", color: "var(--green)", fontWeight: 500 }}>
          Completed
        </span>
      </div>

      {dist && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
          {/* Left: summary card */}
          <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "16px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", marginBottom: 14 }}>
              Distribution statement — {dist.label ?? periodLabel(dist.period)}
            </div>

            {[
              { label: "Period", value: periodLabel(dist.period) },
              { label: "Run date", value: fmtDate(dist.runAt) },
              { label: "Run by", value: dist.runBy?.name ?? "System" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--b3)", fontSize: 12 }}>
                <span style={{ color: "var(--t2)" }}>{label}</span>
                <span style={{ fontWeight: 500, color: "var(--t1)" }}>{value}</span>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--b3)", fontSize: 12 }}>
              <span style={{ color: "var(--t2)" }}>Operating balance used</span>
              <span style={{ fontWeight: 600, color: "var(--blue)" }}>PKR {fmt(dist.operatingBalancePkr)}</span>
            </div>

            {dist.totalCommissionPkr > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--b3)", fontSize: 12 }}>
                <span style={{ color: "var(--t2)" }}>Commissions included</span>
                <span style={{ fontWeight: 600, color: "var(--green)" }}>PKR {fmt(dist.totalCommissionPkr)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid var(--b3)", fontSize: 12 }}>
              <span style={{ color: "var(--t2)" }}>Total distributed</span>
              <span style={{ fontWeight: 700, color: "var(--t1)", fontSize: 14 }}>PKR {fmt(dist.totalDistributedPkr)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", fontSize: 12 }}>
              <span style={{ color: "var(--t2)" }}>Operating balance after</span>
              <span style={{ fontWeight: 600, color: "var(--blue)" }}>PKR 0</span>
            </div>

            {dist.notes && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--bg2)", borderRadius: "var(--rm)", fontSize: 11, color: "var(--t2)" }}>
                {dist.notes}
              </div>
            )}
          </div>

          {/* Right: per-account breakdown */}
          <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--b3)" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>Per-account breakdown</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                  {["Account", "Share", "Distribution", "Commission", "Total paid"].map((h, i) => (
                    <th key={h} style={{ textAlign: i >= 2 ? "right" : i === 1 ? "center" : "left", padding: "10px 16px", fontWeight: 500, fontSize: 11, color: "var(--t2)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dist.items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: idx < dist.items.length - 1 ? "0.5px solid var(--b3)" : "none" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 500 }}>{item.account.name}</td>
                    <td style={{ padding: "11px 16px", textAlign: "center" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "var(--blue-bg)", color: "var(--blue)", fontWeight: 500 }}>
                        {item.sharePct}%
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "right", color: "var(--blue)" }}>
                      PKR {fmt(item.distributionAmountPkr)}
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "right", color: "var(--green)" }}>
                      {item.commissionAmountPkr > 0 ? `PKR ${fmt(item.commissionAmountPkr)}` : "—"}
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600, color: "var(--t1)" }}>
                      PKR {fmt(item.totalPkr)}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ background: "var(--bg2)", borderTop: "0.5px solid var(--b2)" }}>
                  <td colSpan={4} style={{ padding: "10px 16px", fontWeight: 600 }}>Total distributed</td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--blue)" }}>
                    PKR {fmt(totalPaid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
