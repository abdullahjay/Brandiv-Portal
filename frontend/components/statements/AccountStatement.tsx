"use client";

import { useState } from "react";
import { useAccountStatement } from "@frontend/hooks/useStatements";
import { useAccounts } from "@frontend/hooks/useAccounts";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import type { StatementEntry, AccountStatement as AccountStatementType } from "@frontend/types";

function fmt(n: number) {
  return (Math.abs(n) / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  income:       { bg: "var(--green-bg)", fg: "var(--green)" },
  expense:      { bg: "var(--red-bg, #FCEBEB)", fg: "var(--red)" },
  payroll:      { bg: "var(--amber-bg, #FAEEDA)", fg: "var(--amber, #D97706)" },
  distribution: { bg: "var(--blue-bg)", fg: "var(--blue)" },
};

export function exportAccountStatementCSV(stmt: AccountStatementType) {
  const periodLabel = stmt.period
    ? new Date(stmt.period + "-01").toLocaleString("default", { month: "long", year: "numeric" })
    : "All time";
  const rows: string[][] = [
    [`Account Statement — ${stmt.account.name} — ${periodLabel}`],
    [],
    ["Date", "Description", "Type", "Debit (PKR)", "Credit (PKR)", "Balance (PKR)"],
    ["Opening balance", "", "", "", "", String(Math.round(stmt.openingBalance / 100))],
    ...stmt.entries.map((e) => [
      fmtDate(e.date),
      e.description,
      e.type,
      e.debit > 0 ? String(Math.round(e.debit / 100)) : "",
      e.credit > 0 ? String(Math.round(e.credit / 100)) : "",
      String(Math.round(e.balance / 100)),
    ]),
    ["Closing balance", "", "", "", "", String(Math.round(stmt.closingBalance / 100))],
    [],
    ["Total in", "", "", "", String(Math.round(stmt.totalIn / 100)), ""],
    ["Total out", "", "", String(Math.round(stmt.totalOut / 100)), "", ""],
  ];
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `account-statement-${stmt.account.name.replace(/\s+/g, "-")}-${stmt.period ?? "all"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printAccountStatement(stmt: AccountStatementType) {
  const periodLabel = stmt.period
    ? new Date(stmt.period + "-01").toLocaleString("default", { month: "long", year: "numeric" })
    : "All time";
  const rowsHtml = stmt.entries.map((e) => `
    <tr>
      <td>${fmtDate(e.date)}</td>
      <td>${e.description}</td>
      <td><span class="badge">${e.type}</span></td>
      <td class="num red">${e.debit > 0 ? fmt(e.debit) : "—"}</td>
      <td class="num green">${e.credit > 0 ? fmt(e.credit) : "—"}</td>
      <td class="num bold">${fmt(e.balance)}</td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Account Statement</title>
  <style>body{font-family:system-ui,sans-serif;font-size:12px;color:#1a1a18;padding:24px;}
  h2{font-size:16px;margin-bottom:4px;}p{font-size:11px;color:#666;margin-bottom:16px;}
  .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
  .mc{background:#f5f5f3;border-radius:8px;padding:12px;}.mc .lbl{font-size:10px;color:#888;margin-bottom:4px;}.mc .val{font-size:16px;font-weight:600;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  thead tr{background:#f5f5f3;}.th{text-align:left;padding:8px 12px;font-size:10px;color:#888;font-weight:500;}
  td{padding:8px 12px;border-bottom:0.5px solid #e5e5e5;}.num{text-align:right;}.bold{font-weight:600;}
  .green{color:#3B6D11;}.red{color:#A32D2D;}.blue{color:#185FA5;}
  .badge{font-size:9px;padding:2px 6px;border-radius:20px;background:#f0efeb;color:#6b6b67;}
  .opening,.closing{background:#f5f5f3;font-weight:500;}
  @media print{body{padding:0;}}</style></head><body>
  <h2>Account Statement — ${stmt.account.name}</h2>
  <p>${periodLabel} · ${stmt.account.type.replace(/_/g, " ")}</p>
  <div class="metrics">
    <div class="mc"><div class="lbl">Opening balance</div><div class="val">PKR ${fmt(stmt.openingBalance)}</div></div>
    <div class="mc"><div class="lbl">Total in</div><div class="val green">+PKR ${fmt(stmt.totalIn)}</div></div>
    <div class="mc"><div class="lbl">Total out</div><div class="val red">-PKR ${fmt(stmt.totalOut)}</div></div>
  </div>
  <table>
    <thead><tr>
      <th class="th">Date</th><th class="th">Description</th><th class="th">Type</th>
      <th class="th" style="text-align:right;">Debit</th><th class="th" style="text-align:right;">Credit</th>
      <th class="th" style="text-align:right;">Balance</th>
    </tr></thead>
    <tbody>
      <tr class="opening"><td colspan="5" style="padding:8px 12px;">Balance brought forward</td><td class="num bold">${fmt(stmt.openingBalance)}</td></tr>
      ${rowsHtml}
      <tr class="closing"><td colspan="5" style="padding:8px 12px;font-weight:600;">Closing balance</td><td class="num bold blue" style="padding:8px 12px;">PKR ${fmt(stmt.closingBalance)}</td></tr>
    </tbody>
  </table>
  <script>window.onload=function(){window.print();window.close();}<\/script>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

interface AccountStatementProps {
  onExportReady?: (handlers: { exportCSV: () => void; exportPDF: () => void }) => void;
}

export default function AccountStatement({ onExportReady }: AccountStatementProps) {
  const { data: accounts, loading: accLoading } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [period, setPeriod] = useState("");

  const accountId = selectedAccountId ?? (accounts.length > 0 ? accounts[0].id : null);
  const { data: stmt, loading, error } = useAccountStatement(accountId, period);

  // Expose export handlers to parent
  if (onExportReady && stmt) {
    onExportReady({
      exportCSV: () => exportAccountStatementCSV(stmt),
      exportPDF: () => printAccountStatement(stmt),
    });
  }

  const orderedAccounts = [
    ...accounts.filter((a) => a.type === "operating"),
    ...accounts.filter((a) => a.type === "company_reserve"),
    ...accounts.filter((a) => a.type === "stakeholder"),
  ];

  return (
    <div>
      {/* Account selector + period */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {accLoading ? (
          <div style={{ fontSize: 12, color: "var(--t3)" }}>Loading accounts…</div>
        ) : (
          orderedAccounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAccountId(a.id)}
              style={{
                height: 30,
                padding: "0 12px",
                borderRadius: "var(--rm)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                border: `0.5px solid ${(selectedAccountId ?? accounts[0]?.id) === a.id ? "var(--blue)" : "var(--b2)"}`,
                background: (selectedAccountId ?? accounts[0]?.id) === a.id ? "var(--blue-bg)" : "transparent",
                color: (selectedAccountId ?? accounts[0]?.id) === a.id ? "var(--blue)" : "var(--t1)",
                transition: "all .1s",
              }}
            >
              {a.name}
            </button>
          ))
        )}
        <div style={{ marginLeft: "auto" }}>
          <PeriodSelect value={period} onChange={setPeriod} includeAll allLabel="All time" />
        </div>
      </div>

      {/* Summary metrics */}
      {stmt && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Opening balance", value: `PKR ${fmt(stmt.openingBalance)}`, color: "var(--t1)" },
            { label: "Total in", value: `+PKR ${fmt(stmt.totalIn)}`, color: "var(--green)" },
            { label: "Total out", value: `-PKR ${fmt(stmt.totalOut)}`, color: "var(--red)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--bg2)", borderRadius: "var(--rm)", padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading…
          </div>
        ) : error ? (
          <div style={{ padding: 24, fontSize: 12, color: "var(--red)" }}>{error}</div>
        ) : !stmt ? (
          <div style={{ padding: 48, textAlign: "center", fontSize: 12, color: "var(--t3)" }}>Select an account to view its statement</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "36%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                {["Date", "Description", "Type", "Debit", "Credit", "Balance"].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 3 ? "right" : "left", padding: "10px 14px", fontWeight: 500, fontSize: 11, color: "var(--t2)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Opening balance row */}
              <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                <td style={{ padding: "9px 14px", fontSize: 11, color: "var(--t3)" }}>Opening</td>
                <td style={{ padding: "9px 14px", color: "var(--t2)", fontSize: 11 }}>Balance brought forward</td>
                <td /><td /><td />
                <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, fontSize: 12 }}>
                  {fmt(stmt.openingBalance)}
                </td>
              </tr>

              {stmt.entries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "32px 14px", textAlign: "center", color: "var(--t3)", fontSize: 12 }}>
                    No transactions for this period
                  </td>
                </tr>
              ) : (
                stmt.entries.map((entry: StatementEntry) => {
                  const tc = TYPE_COLORS[entry.type] ?? TYPE_COLORS.expense;
                  return (
                    <tr key={entry.id} style={{ borderBottom: "0.5px solid var(--b3)" }}>
                      <td style={{ padding: "9px 14px", color: "var(--t2)", fontSize: 11, whiteSpace: "nowrap" }}>{fmtDate(entry.date)}</td>
                      <td style={{ padding: "9px 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.description}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 500, background: tc.bg, color: tc.fg }}>
                          {entry.type}
                        </span>
                      </td>
                      <td style={{ padding: "9px 14px", textAlign: "right", color: "var(--red)" }}>
                        {entry.debit > 0 ? fmt(entry.debit) : "—"}
                      </td>
                      <td style={{ padding: "9px 14px", textAlign: "right", color: "var(--green)" }}>
                        {entry.credit > 0 ? fmt(entry.credit) : "—"}
                      </td>
                      <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 600, color: entry.balance < 0 ? "var(--red)" : "var(--t1)" }}>
                        {entry.balance < 0 ? "−" : ""}{fmt(entry.balance)}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Closing balance row */}
              <tr style={{ background: "var(--bg2)", borderTop: "0.5px solid var(--b2)" }}>
                <td colSpan={5} style={{ padding: "10px 14px", fontWeight: 600, fontSize: 12 }}>Closing balance</td>
                <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "var(--blue)" }}>
                  PKR {fmt(stmt.closingBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
