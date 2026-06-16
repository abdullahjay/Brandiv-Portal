"use client";

import { useState, useEffect, useCallback } from "react";
import { runPayrollBatchRequest, payPayrollRequest } from "@frontend/hooks/usePayroll";
import type { ApiResponse, Employee, PayrollRecord, PayrollRunResult } from "@frontend/types";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return (n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function prevPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

function monthEnd(p: string): Date {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m, 0);
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Payslip generator ────────────────────────────────────────────────────────

function downloadPayslip(record: PayrollRecord, companyName = "Brandiv Labs") {
  const name = record.employee?.name ?? record.user?.name ?? "Employee";
  const designation = record.employee?.designation ?? record.user?.role ?? "";
  const department = record.employee?.department ?? "";
  const period = periodLabel(record.period);
  const gross = fmt(record.grossPkr);
  const tax = fmt(record.taxPkr);
  const deductions = fmt(record.deductions);
  const net = fmt(record.netPkr);
  const paidAt = record.paidAt
    ? new Date(record.paidAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip — ${name}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#111;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a56db;padding-bottom:16px;margin-bottom:20px}
  .company{font-size:20px;font-weight:700;color:#1a56db}.title{font-size:13px;color:#666;margin-top:2px}
  .badge{background:#e1effe;color:#1a56db;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
  .section{margin-bottom:18px}.section-title{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}.field p{margin:2px 0 0;font-weight:600}
  table{width:100%;border-collapse:collapse}td{padding:9px 12px;border-bottom:1px solid #e5e7eb}td:last-child{text-align:right;font-weight:600}
  .total-row td{font-size:15px;font-weight:700;color:#1a56db;border-top:2px solid #1a56db;border-bottom:none}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
</style></head><body>
<div class="header"><div><div class="company">${companyName}</div><div class="title">PAYSLIP</div></div><div class="badge">${period}</div></div>
<div class="section"><div class="section-title">Employee Details</div><div class="grid">
  <div class="field"><label>Name</label><p>${name}</p></div>
  ${designation ? `<div class="field"><label>Designation</label><p>${designation}</p></div>` : ""}
  ${department ? `<div class="field"><label>Department</label><p>${department}</p></div>` : ""}
  <div class="field"><label>Payment Date</label><p>${paidAt}</p></div>
</div></div>
<div class="section"><div class="section-title">Earnings &amp; Deductions</div><table>
  <tr><td>Gross Salary</td><td>PKR ${gross}</td></tr>
  ${Number(record.taxPkr) > 0 ? `<tr><td>Income Tax</td><td style="color:#d97706">− PKR ${tax}</td></tr>` : ""}
  ${Number(record.deductions) > 0 ? `<tr><td>Other Deductions</td><td style="color:#dc2626">− PKR ${deductions}</td></tr>` : ""}
  <tr class="total-row"><td>Net Payable</td><td>PKR ${net}</td></tr>
</table></div>
${record.notes ? `<div class="section"><div class="section-title">Notes</div><p style="color:#374151">${record.notes}</p></div>` : ""}
<div class="footer">Computer-generated payslip · ID: ${record.id.slice(0, 8).toUpperCase()}</div>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

// ─── MonthNav ─────────────────────────────────────────────────────────────────

function MonthNav({ period, onChange }: { period: string; onChange: (p: string) => void }) {
  const [y, m] = period.split("-").map(Number);
  const now = new Date();
  const isNow = y === now.getFullYear() && m === now.getMonth() + 1;

  function prev() {
    if (m === 1) onChange(`${y - 1}-12`);
    else onChange(`${y}-${String(m - 1).padStart(2, "0")}`);
  }
  function next() {
    if (isNow) return;
    if (m === 12) onChange(`${y + 1}-01`);
    else onChange(`${y}-${String(m + 1).padStart(2, "0")}`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--bg2)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "3px" }}>
      <button onClick={prev} style={{ width: 28, height: 28, border: "none", background: "transparent", borderRadius: 5, cursor: "pointer", color: "var(--t2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
      </button>
      <span style={{ minWidth: 120, textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{periodLabel(period)}</span>
      <button onClick={next} disabled={isNow} style={{ width: 28, height: 28, border: "none", background: "transparent", borderRadius: 5, cursor: isNow ? "not-allowed" : "pointer", color: isNow ? "var(--t3)" : "var(--t2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
      </button>
    </div>
  );
}

// ─── Row state ────────────────────────────────────────────────────────────────

interface RowState {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  grossStr: string;
  taxStr: string;
  deductStr: string;
  checked: boolean;
  // lock state
  alreadyPaid: boolean;        // has a PAID record this period → locked out
  hasPendingRecord: boolean;   // has a PENDING record this period → locked, manage from list
  // source hint shown to user
  sourceHint: "compensation" | "last_record" | "base_salary" | "none";
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface RunPayrollModalProps {
  open: boolean;
  onClose: () => void;
  initialPeriod?: string;
  onCompleted: (period: string) => void;
}

export default function RunPayrollModal({ open, onClose, initialPeriod, onCompleted }: RunPayrollModalProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PayrollRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [markPaidImmediately, setMarkPaidImmediately] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const loadData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const prev = prevPeriod(period);
      const end = monthEnd(period);

      const [empRes, currentRes, prevRes] = await Promise.all([
        fetch("/api/employees?status=active&pageSize=200"),
        fetch(`/api/payroll?period=${period}&pageSize=200`),
        fetch(`/api/payroll?period=${prev}&pageSize=200`),
      ]);

      const empJson: ApiResponse<{ items: Employee[] }> = await empRes.json();
      const currentJson: ApiResponse<{ items: PayrollRecord[] }> = await currentRes.json();
      const prevJson: ApiResponse<{ items: PayrollRecord[] }> = await prevRes.json();

      if (!empJson.success) throw new Error("Failed to load employees");

      const currentRecords = currentJson.data?.items ?? [];
      const prevRecords = prevJson.data?.items ?? [];

      // Maps for quick lookup
      const currentByEmpId = new Map(currentRecords.filter(r => r.employee?.id).map(r => [r.employee!.id, r]));
      const prevByEmpId = new Map(prevRecords.filter(r => r.employee?.id).map(r => [r.employee!.id, r]));

      // Filter by join date — only show employees who had joined by end of this period
      const eligible = (empJson.data?.items ?? []).filter((emp) => {
        if (!emp.joinDate) return true;
        return new Date(emp.joinDate) <= end;
      });

      const newRows: RowState[] = eligible.map((emp) => {
        const current = currentByEmpId.get(emp.id) ?? null;
        const prev = prevByEmpId.get(emp.id) ?? null;

        const alreadyPaid = current?.status === "paid";
        const hasPendingRecord = current?.status === "pending";

        // Determine prefill source (priority: current record > prev record > baseSalary)
        let grossStr = "";
        let taxStr = "0";
        let deductStr = "0";
        let sourceHint: RowState["sourceHint"] = "none";

        if (current) {
          // Show current record values (read-only)
          grossStr = String(current.grossPkr / 100);
          taxStr = String(current.taxPkr / 100);
          deductStr = String(current.deductions / 100);
          sourceHint = "last_record";
        } else if (prev) {
          // Carry forward from last month
          grossStr = String(prev.grossPkr / 100);
          taxStr = String(prev.taxPkr / 100);
          deductStr = String(prev.deductions / 100);
          sourceHint = "last_record";
        } else if (emp.baseSalary && emp.baseSalary > 0) {
          grossStr = String(emp.baseSalary / 100);
          if (emp.defaultTaxPkr && emp.defaultTaxPkr > 0) {
            taxStr = String(emp.defaultTaxPkr / 100);
          }
          sourceHint = "compensation";
        }

        return {
          employeeId: emp.id,
          name: emp.name,
          designation: emp.designation ?? "",
          department: emp.department ?? "",
          grossStr,
          taxStr,
          deductStr,
          checked: !alreadyPaid && !hasPendingRecord,
          alreadyPaid,
          hasPendingRecord,
          sourceHint,
        };
      });

      setRows(newRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [open, period]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!open) {
      setResult(null);
      setConfirmOpen(false);
      setError(null);
      setMarkingPaid(false);
      setMarkPaidImmediately(false);
      setPeriod(initialPeriod ?? currentPeriod());
    }
  }, [open, initialPeriod]);

  useEffect(() => {
    if (markPaidImmediately) {
      setRows(prev => prev.map(r => r.hasPendingRecord ? { ...r, checked: true } : r));
    } else {
      setRows(prev => prev.map(r => r.hasPendingRecord ? { ...r, checked: false } : r));
    }
  }, [markPaidImmediately]);

  function updateRow(idx: number, field: "grossStr" | "taxStr" | "deductStr", value: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function toggleRow(idx: number) {
    setRows((prev) => prev.map((r, i) =>
      i === idx && !r.alreadyPaid && (markPaidImmediately || !r.hasPendingRecord)
        ? { ...r, checked: !r.checked } : r
    ));
  }

  function toggleAll(val: boolean) {
    setRows((prev) => prev.map((r) =>
      (r.alreadyPaid || (!markPaidImmediately && r.hasPendingRecord)) ? r : { ...r, checked: val }
    ));
  }

  const editableRows = rows.filter((r) => !r.alreadyPaid && (markPaidImmediately ? true : !r.hasPendingRecord));
  const selectedRows = editableRows.filter((r) => r.checked);
  const allChecked = editableRows.length > 0 && editableRows.every((r) => r.checked);
  const totalGross = selectedRows.reduce((s, r) => s + (parseFloat(r.grossStr) || 0) * 100, 0);
  const totalTax = selectedRows.reduce((s, r) => s + (parseFloat(r.taxStr) || 0) * 100, 0);
  const totalDeduct = selectedRows.reduce((s, r) => s + (parseFloat(r.deductStr) || 0) * 100, 0);
  const totalNet = totalGross - totalTax - totalDeduct;
  const invalidCount = selectedRows.filter((r) => !(parseFloat(r.grossStr) > 0)).length;
  const validToRun = selectedRows.length - invalidCount;

  async function handleRun() {
    setRunning(true);
    setError(null);
    setConfirmOpen(false);
    try {
      const entries = selectedRows
        .filter((r) => parseFloat(r.grossStr) > 0)
        .map((r) => ({
          employeeId: r.employeeId,
          grossPkr: parseFloat(r.grossStr),
          taxPkr: parseFloat(r.taxStr) || 0,
          deductions: parseFloat(r.deductStr) || 0,
        }));

      const res = await runPayrollBatchRequest(period, entries, markPaidImmediately);
      setResult(res);
      onCompleted(period);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payroll run failed");
    } finally {
      setRunning(false);
      setMarkingPaid(false);
    }
  }

  if (!open) return null;

  const inputS: React.CSSProperties = {
    width: "100%", height: 30, padding: "0 8px", border: "0.5px solid var(--b3)",
    borderRadius: "var(--rm)", background: "var(--bg1)", fontSize: 12,
    color: "var(--t1)", outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", textAlign: "right",
  };

  const paidCount = rows.filter(r => r.alreadyPaid).length;
  const pendingCount = rows.filter(r => r.hasPendingRecord).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", overflowY: "auto" }}>
      <div style={{ background: "var(--bg1)", borderRadius: "var(--rl)", width: "100%", maxWidth: 880, boxShadow: "0 12px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: "18px 22px", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>Run Payroll</div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>Process salary payments for active employees</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MonthNav period={period} onChange={(v) => { setPeriod(v); setResult(null); }} />
            <button onClick={onClose} style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer", color: "var(--t3)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
              <i className="ti ti-x" style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>

        {/* ── Result view ──────────────────────────────────────────────────── */}
        {result ? (
          <div style={{ padding: 24 }}>
            {(running || markingPaid) ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "32px 0", justifyContent: "center", color: "var(--t3)" }}>
                <i className="ti ti-loader-2" style={{ fontSize: 20 }} />
                <span style={{ fontSize: 13 }}>{markingPaid ? "Marking records as paid…" : "Processing payroll…"}</span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rl)", padding: "16px 18px", marginBottom: 20 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="ti ti-check" style={{ fontSize: 20, color: "#fff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)" }}>
                      Payroll {markPaidImmediately ? "Paid" : "Created"} — {periodLabel(period)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 2 }}>
                      {result.created} record{result.created !== 1 ? "s" : ""} {markPaidImmediately ? "paid" : "created as pending"}
                      {result.skipped > 0 ? ` · ${result.skipped} skipped (already had records)` : ""}
                      {" · "}Total net: <strong>PKR {fmt(result.records.reduce((s, r) => s + r.netPkr, 0))}</strong>
                    </div>
                  </div>
                  <button
                    className="btn-outline"
                    style={{ marginLeft: "auto", height: 32, fontSize: 12, flexShrink: 0 }}
                    onClick={() => result.records.forEach((r, i) => setTimeout(() => downloadPayslip(r), i * 300))}
                  >
                    <i className="ti ti-download" style={{ fontSize: 12 }} /> Download All Payslips
                  </button>
                </div>

                {result.alreadyPaid.length > 0 && (
                  <div style={{ display: "flex", gap: 12, background: "var(--red-bg)", border: "0.5px solid var(--red)", borderRadius: "var(--rl)", padding: "14px 16px", marginBottom: 16, alignItems: "flex-start" }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", marginBottom: 4 }}>
                        {result.alreadyPaid.length} employee{result.alreadyPaid.length !== 1 ? "s" : ""} already paid — skipped
                      </div>
                      <div style={{ fontSize: 12, color: "var(--t2)" }}>
                        The following employees already had a <strong>paid</strong> record for {periodLabel(period)} and were not processed:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {result.alreadyPaid.map((name) => (
                          <span key={name} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: "var(--red)", color: "#fff", fontWeight: 500 }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden", marginBottom: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                        {["Employee", "Gross", "Tax", "Deductions", "Net", ""].map((h, i) => (
                          <th key={i} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i >= 1 && i <= 4 ? "right" : "left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.records.map((r) => {
                        const name = r.employee?.name ?? r.user?.name ?? "—";
                        const sub = r.employee?.designation ?? r.employee?.department ?? "";
                        return (
                          <tr key={r.id} style={{ borderBottom: "0.5px solid var(--b3)" }}>
                            <td style={{ padding: "10px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--blue-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--blue)", flexShrink: 0 }}>
                                  {initials(name)}
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{name}</div>
                                  {sub && <div style={{ fontSize: 11, color: "var(--t3)" }}>{sub}</div>}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, color: "var(--t2)" }}>PKR {fmt(r.grossPkr)}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, color: "#D97706" }}>{r.taxPkr > 0 ? `−PKR ${fmt(r.taxPkr)}` : "—"}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, color: "var(--red)" }}>{r.deductions > 0 ? `−PKR ${fmt(r.deductions)}` : "—"}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--green)" }}>PKR {fmt(r.netPkr)}</td>
                            <td style={{ padding: "10px 14px", textAlign: "right" }}>
                              <button className="btn-outline" style={{ height: 28, fontSize: 11 }} onClick={() => downloadPayslip(r)}>
                                <i className="ti ti-file-download" style={{ fontSize: 11 }} /> Payslip
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-primary" onClick={onClose} style={{ height: 34 }}>Close</button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Summary strip ─────────────────────────────────────────── */}
            {!loading && rows.length > 0 && (
              <div style={{ padding: "10px 22px", borderBottom: "0.5px solid var(--b3)", background: "var(--bg2)", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--t2)" }}>
                  <span><strong style={{ color: "var(--t1)" }}>{editableRows.length}</strong> eligible</span>
                  {paidCount > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
                      {paidCount} already paid
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#D97706", display: "inline-block" }} />
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                {selectedRows.length > 0 && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 12 }}>
                    <span style={{ color: "var(--t2)" }}>Gross: <strong style={{ color: "var(--t1)" }}>PKR {fmt(totalGross)}</strong></span>
                    {totalTax > 0 && <span style={{ color: "var(--t2)" }}>Tax: <strong style={{ color: "#D97706" }}>PKR {fmt(totalTax)}</strong></span>}
                    {totalDeduct > 0 && <span style={{ color: "var(--t2)" }}>Ded: <strong style={{ color: "var(--red)" }}>PKR {fmt(totalDeduct)}</strong></span>}
                    <span style={{ color: "var(--t2)" }}>Net: <strong style={{ color: "var(--blue)" }}>PKR {fmt(totalNet)}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* ── Employee table ────────────────────────────────────────── */}
            <div style={{ overflowY: "auto", maxHeight: "52vh" }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 13 }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading employees…
                </div>
              ) : error ? (
                <div style={{ padding: 24, color: "var(--red)", fontSize: 13 }}>{error}</div>
              ) : rows.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--t2)" }}>
                  <i className="ti ti-users" style={{ fontSize: 32, color: "var(--t3)", display: "block", marginBottom: 10 }} />
                  <div style={{ fontSize: 14 }}>No eligible employees for {periodLabel(period)}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>
                    Employees must be active and have joined on or before this month
                  </div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                      <th style={{ padding: "8px 14px", width: 40 }}>
                        <input
                          type="checkbox"
                          checked={allChecked && editableRows.length > 0}
                          onChange={(e) => toggleAll(e.target.checked)}
                          style={{ cursor: "pointer", width: 14, height: 14 }}
                        />
                      </th>
                      {["Employee", "Gross (PKR)", "Tax (PKR)", "Deductions (PKR)", "Net Payable", "Status"].map((h, i) => (
                        <th key={h} style={{ padding: "8px 10px", fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i >= 1 && i <= 4 ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const isCheckboxLocked = row.alreadyPaid || (!markPaidImmediately && row.hasPendingRecord);
                      const isInputLocked = row.alreadyPaid || row.hasPendingRecord;
                      const isLocked = isCheckboxLocked; // alias for row styling
                      const missingGross = row.checked && !isInputLocked && !(parseFloat(row.grossStr) > 0);
                      const gross = (parseFloat(row.grossStr) || 0) * 100;
                      const rowTax = (parseFloat(row.taxStr) || 0) * 100;
                      const deduct = (parseFloat(row.deductStr) || 0) * 100;
                      const net = gross - rowTax - deduct;

                      return (
                        <tr
                          key={row.employeeId}
                          style={{
                            borderBottom: "0.5px solid var(--b3)",
                            background: isLocked ? "var(--bg2)" : row.checked ? "var(--blue-bg)" : "transparent",
                            opacity: isLocked ? 0.6 : 1,
                            transition: "background .08s",
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ padding: "10px 14px", width: 40 }}>
                            <input
                              type="checkbox"
                              checked={row.checked}
                              disabled={isCheckboxLocked}
                              onChange={() => toggleRow(idx)}
                              style={{ cursor: isCheckboxLocked ? "not-allowed" : "pointer", width: 14, height: 14 }}
                            />
                          </td>

                          {/* Employee */}
                          <td style={{ padding: "10px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                                background: row.alreadyPaid ? "var(--green-bg)" : row.hasPendingRecord ? "#FEF3C7" : "var(--blue-bg)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700,
                                color: row.alreadyPaid ? "var(--green)" : row.hasPendingRecord ? "#D97706" : "var(--blue)",
                              }}>
                                {initials(row.name)}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{row.name}</div>
                                <div style={{ fontSize: 11, color: "var(--t3)" }}>
                                  {[row.designation, row.department].filter(Boolean).join(" · ") || "—"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Gross */}
                          <td style={{ padding: "10px 10px", width: 140 }}>
                            <div>
                              <input
                                type="number" min="0" step="1"
                                value={row.grossStr}
                                onChange={(e) => updateRow(idx, "grossStr", e.target.value)}
                                disabled={isInputLocked}
                                placeholder="Enter amount"
                                style={{ ...inputS, borderColor: missingGross ? "var(--red)" : "var(--b3)" }}
                              />
                              {!isLocked && row.sourceHint === "last_record" && (
                                <div style={{ fontSize: 9, color: "var(--blue)", marginTop: 2, textAlign: "right" }}>↑ last month</div>
                              )}
                              {!isLocked && row.sourceHint === "base_salary" && (
                                <div style={{ fontSize: 9, color: "var(--t3)", marginTop: 2, textAlign: "right" }}>↑ base salary</div>
                              )}
                              {!isLocked && row.sourceHint === "compensation" && (
                                <div style={{ fontSize: 9, color: "var(--green)", marginTop: 2, textAlign: "right" }}>↑ compensation</div>
                              )}
                              {missingGross && <div style={{ fontSize: 10, color: "var(--red)", marginTop: 2, textAlign: "right" }}>Required</div>}
                            </div>
                          </td>

                          {/* Tax */}
                          <td style={{ padding: "10px 10px", width: 120 }}>
                            <input type="number" min="0" step="1" value={row.taxStr} onChange={(e) => updateRow(idx, "taxStr", e.target.value)} disabled={isInputLocked} placeholder="0" style={inputS} />
                          </td>

                          {/* Deductions */}
                          <td style={{ padding: "10px 10px", width: 120 }}>
                            <input type="number" min="0" step="1" value={row.deductStr} onChange={(e) => updateRow(idx, "deductStr", e.target.value)} disabled={isInputLocked} placeholder="0" style={inputS} />
                          </td>

                          {/* Net */}
                          <td style={{ padding: "10px 10px", textAlign: "right", fontSize: 13, fontWeight: 600, color: net > 0 ? "var(--blue)" : "var(--t3)", width: 120 }}>
                            {gross > 0 ? `PKR ${fmt(net)}` : "—"}
                          </td>

                          {/* Status */}
                          <td style={{ padding: "10px 14px", width: 130 }}>
                            {row.alreadyPaid ? (
                              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "var(--green-bg)", color: "var(--green)", fontWeight: 600 }}>
                                <i className="ti ti-circle-check" style={{ fontSize: 10, marginRight: 3 }} />Paid
                              </span>
                            ) : row.hasPendingRecord && markPaidImmediately ? (
                              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "var(--green-bg)", color: "var(--green)", fontWeight: 600 }}>
                                <i className="ti ti-arrow-up" style={{ fontSize: 10, marginRight: 3 }} />Will mark paid
                              </span>
                            ) : row.hasPendingRecord ? (
                              <div>
                                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#FEF3C7", color: "#D97706", fontWeight: 600 }}>
                                  <i className="ti ti-clock" style={{ fontSize: 10, marginRight: 3 }} />Pending
                                </span>
                                <div style={{ fontSize: 9, color: "var(--t3)", marginTop: 3 }}>Manage in payroll list</div>
                              </div>
                            ) : row.checked ? (
                              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "var(--blue-bg)", color: "var(--blue)", fontWeight: 600 }}>Selected</span>
                            ) : (
                              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "var(--bg3)", color: "var(--t3)", fontWeight: 500 }}>Skipped</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {error && (
              <div style={{ margin: "0 22px 12px", padding: "10px 12px", background: "var(--red-bg)", borderRadius: "var(--rm)", fontSize: 12, color: "var(--red)", display: "flex", gap: 6, alignItems: "center" }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 13 }} />{error}
              </div>
            )}

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div style={{ padding: "12px 22px", borderTop: "0.5px solid var(--b3)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              {/* Mark paid immediately toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                <div
                  onClick={() => setMarkPaidImmediately(p => !p)}
                  style={{
                    width: 32, height: 18, borderRadius: 9, background: markPaidImmediately ? "var(--green)" : "var(--b3)",
                    position: "relative", transition: "background .15s", cursor: "pointer", flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: "absolute", top: 2, left: markPaidImmediately ? 16 : 2,
                    width: 14, height: 14, borderRadius: "50%", background: "#fff",
                    transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--t2)" }}>
                  Mark as <strong style={{ color: markPaidImmediately ? "var(--green)" : "var(--t2)" }}>paid</strong> immediately
                </span>
                {!markPaidImmediately && <span style={{ fontSize: 11, color: "var(--t3)" }}>(creates as pending)</span>}
              </label>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--t3)" }}>
                  {validToRun > 0
                    ? <><strong style={{ color: "var(--t1)" }}>{validToRun}</strong> employee{validToRun !== 1 ? "s" : ""} · PKR {fmt(totalNet)} net{invalidCount > 0 ? <span style={{ color: "#D97706", marginLeft: 4 }}>({invalidCount} missing salary)</span> : null}</>
                    : "No employees selected"
                  }
                </span>
                <button className="btn-outline" style={{ height: 34 }} onClick={onClose}>Cancel</button>

                {!confirmOpen ? (
                  <button
                    className="btn-primary"
                    style={{ height: 34, opacity: (validToRun === 0 || running) ? 0.5 : 1 }}
                    disabled={validToRun === 0 || running}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <i className="ti ti-player-play" style={{ fontSize: 12 }} />
                    {markPaidImmediately ? `Pay Now (${validToRun})` : `Run Payroll (${validToRun})`}
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: markPaidImmediately ? "var(--green-bg)" : "var(--amber-bg)", border: `0.5px solid ${markPaidImmediately ? "var(--green)" : "#D97706"}`, borderRadius: "var(--rm)", padding: "4px 10px" }}>
                    <span style={{ fontSize: 12, color: markPaidImmediately ? "var(--green)" : "#D97706", fontWeight: 500 }}>
                      {markPaidImmediately
                        ? `Pay ${validToRun} employee${validToRun !== 1 ? "s" : ""} now?`
                        : `Create ${validToRun} pending record${validToRun !== 1 ? "s" : ""}?`
                      }
                    </span>
                    <button className="btn-outline" style={{ height: 28, fontSize: 11 }} onClick={() => setConfirmOpen(false)}>No</button>
                    <button
                      className="btn-primary"
                      style={{ height: 28, fontSize: 11, background: markPaidImmediately ? "var(--green)" : undefined }}
                      onClick={handleRun}
                      disabled={running}
                    >
                      {running ? <><i className="ti ti-loader-2" style={{ fontSize: 11 }} /> Running…</> : "Yes, confirm"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
