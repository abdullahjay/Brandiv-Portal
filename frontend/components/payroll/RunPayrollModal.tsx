"use client";

import { useState, useEffect, useCallback } from "react";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import { runPayrollBatchRequest } from "@frontend/hooks/usePayroll";
import type { ApiResponse, Employee, PayrollRecord, PayrollRunResult } from "@frontend/types";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return (n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtPeriod(p: string) {
  const [y, m] = p.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Payslip generator ────────────────────────────────────────────────────────

function downloadPayslip(record: PayrollRecord, companyName = "Brandiv Labs") {
  const name = record.employee?.name ?? record.user?.name ?? "Employee";
  const designation = record.employee?.designation ?? record.user?.role ?? "";
  const department = record.employee?.department ?? "";
  const period = fmtPeriod(record.period);
  const gross = fmt(record.grossPkr);
  const deductions = fmt(record.deductions);
  const net = fmt(record.netPkr);
  const paidAt = record.paidAt ? new Date(record.paidAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "—";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip — ${name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #111; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 20px; }
  .company { font-size: 20px; font-weight: 700; color: #1a56db; }
  .title { font-size: 13px; color: #666; margin-top: 2px; }
  .badge { background: #e1effe; color: #1a56db; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .field p { margin: 2px 0 0; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }
  td:last-child { text-align: right; font-weight: 600; }
  .total-row td { font-size: 15px; font-weight: 700; color: #1a56db; border-top: 2px solid #1a56db; border-bottom: none; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
</style></head><body>
<div class="header">
  <div>
    <div class="company">${companyName}</div>
    <div class="title">PAYSLIP</div>
  </div>
  <div class="badge">${period}</div>
</div>

<div class="section">
  <div class="section-title">Employee Details</div>
  <div class="grid">
    <div class="field"><label>Name</label><p>${name}</p></div>
    ${designation ? `<div class="field"><label>Designation</label><p>${designation}</p></div>` : ""}
    ${department ? `<div class="field"><label>Department</label><p>${department}</p></div>` : ""}
    <div class="field"><label>Payment Date</label><p>${paidAt}</p></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Earnings &amp; Deductions</div>
  <table>
    <tr><td>Gross Salary</td><td>PKR ${gross}</td></tr>
    ${Number(record.deductions) > 0 ? `<tr><td>Deductions</td><td style="color:#dc2626">− PKR ${deductions}</td></tr>` : ""}
    <tr class="total-row"><td>Net Payable</td><td>PKR ${net}</td></tr>
  </table>
</div>

${record.notes ? `<div class="section"><div class="section-title">Notes</div><p style="color:#374151">${record.notes}</p></div>` : ""}

<div class="footer">
  This is a computer-generated payslip. Transaction ID: ${record.id.slice(0, 8).toUpperCase()}
</div>
<script>window.onload = () => { window.print(); }</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

function downloadAllPayslips(records: PayrollRecord[], companyName?: string) {
  records.forEach((r, i) => {
    setTimeout(() => downloadPayslip(r, companyName), i * 300);
  });
}

// ─── Row state ────────────────────────────────────────────────────────────────

interface RowState {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  grossStr: string;
  deductStr: string;
  checked: boolean;
  alreadyPaid: boolean;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface RunPayrollModalProps {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export default function RunPayrollModal({ open, onClose, onCompleted }: RunPayrollModalProps) {
  const [period, setPeriod] = useState(currentPeriod());
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PayrollRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Load active employees + existing payroll for period
  const loadData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const [empRes, payrollRes] = await Promise.all([
        fetch("/api/employees?status=active&pageSize=200"),
        fetch(`/api/payroll?period=${period}&pageSize=200`),
      ]);
      const empJson: ApiResponse<{ items: Employee[] }> = await empRes.json();
      const payrollJson: ApiResponse<{ items: PayrollRecord[] }> = await payrollRes.json();

      if (!empJson.success) throw new Error("Failed to load employees");

      const paidIds = new Set(
        (payrollJson.data?.items ?? [])
          .filter((r) => r.employee?.id)
          .map((r) => r.employee!.id)
      );

      const newRows: RowState[] = (empJson.data?.items ?? []).map((emp) => {
        const already = paidIds.has(emp.id);
        const basePkr = emp.baseSalary ? emp.baseSalary / 100 : 0;
        return {
          employeeId: emp.id,
          name: emp.name,
          designation: emp.designation ?? "",
          department: emp.department ?? "",
          grossStr: basePkr > 0 ? String(basePkr) : "",
          deductStr: "0",
          checked: !already,
          alreadyPaid: already,
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
    if (!open) { setResult(null); setConfirmOpen(false); setError(null); }
  }, [open]);

  function updateRow(idx: number, field: "grossStr" | "deductStr", value: string) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function toggleRow(idx: number) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r));
  }

  function toggleAll(val: boolean) {
    setRows((prev) => prev.map((r) => r.alreadyPaid ? r : { ...r, checked: val }));
  }

  const selectedRows = rows.filter((r) => r.checked && !r.alreadyPaid);
  const allChecked = rows.filter((r) => !r.alreadyPaid).every((r) => r.checked);
  const totalGross = selectedRows.reduce((s, r) => s + (parseFloat(r.grossStr) || 0) * 100, 0);
  const totalDeduct = selectedRows.reduce((s, r) => s + (parseFloat(r.deductStr) || 0) * 100, 0);
  const totalNet = totalGross - totalDeduct;
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
          deductions: parseFloat(r.deductStr) || 0,
        }));
      const res = await runPayrollBatchRequest(period, entries);
      setResult(res);
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payroll run failed");
    } finally {
      setRunning(false);
    }
  }

  if (!open) return null;

  const inputS: React.CSSProperties = {
    width: "100%", height: 30, padding: "0 8px", border: "0.5px solid var(--b3)",
    borderRadius: "var(--rm)", background: "var(--bg1)", fontSize: 12, color: "var(--t1)",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box", textAlign: "right",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", overflowY: "auto" }}>
      <div style={{ background: "var(--bg1)", borderRadius: "var(--rl)", width: "100%", maxWidth: 860, boxShadow: "0 12px 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>Run Payroll</div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>Process salary payments for all active employees</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <PeriodSelect value={period} onChange={(v) => { setPeriod(v); setResult(null); }} style={{ height: 32 }} />
            <button onClick={onClose} style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer", color: "var(--t3)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
              <i className="ti ti-x" style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>

        {/* Result state */}
        {result ? (
          <div style={{ padding: 24 }}>
            {/* Success banner */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rl)", padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className="ti ti-check" style={{ fontSize: 20, color: "#fff" }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)" }}>Payroll Complete — {fmtPeriod(period)}</div>
                <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 2 }}>
                  {result.created} record{result.created !== 1 ? "s" : ""} processed
                  {result.skipped > 0 ? ` · ${result.skipped} skipped (already paid)` : ""}
                  {" · "}Total net: <strong>PKR {fmt(result.records.reduce((s, r) => s + r.netPkr, 0))}</strong>
                </div>
              </div>
              <button
                className="btn-outline"
                style={{ marginLeft: "auto", height: 32, fontSize: 12, flexShrink: 0 }}
                onClick={() => downloadAllPayslips(result.records)}
              >
                <i className="ti ti-download" style={{ fontSize: 12 }} /> Download All Payslips
              </button>
            </div>

            {/* Records table */}
            <div style={{ border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                    {["Employee", "Gross", "Deductions", "Net Paid", ""].map((h, i) => (
                      <th key={i} style={{ padding: "8px 14px", fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i >= 1 && i <= 3 ? "right" : "left" }}>{h}</th>
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
                        <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 12, color: "var(--red)" }}>{r.deductions > 0 ? `− PKR ${fmt(r.deductions)}` : "—"}</td>
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

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn-primary" onClick={onClose} style={{ height: 34 }}>Close</button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            {!loading && rows.length > 0 && (
              <div style={{ padding: "12px 22px", borderBottom: "0.5px solid var(--b3)", background: "var(--bg2)", display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "var(--t2)" }}>
                  <strong style={{ color: "var(--t1)" }}>{selectedRows.length}</strong> of {rows.filter(r => !r.alreadyPaid).length} employees selected
                  {rows.filter(r => r.alreadyPaid).length > 0 && (
                    <span style={{ marginLeft: 8, color: "var(--t3)" }}>· {rows.filter(r => r.alreadyPaid).length} already paid</span>
                  )}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 20, fontSize: 12 }}>
                  <span style={{ color: "var(--t2)" }}>Gross: <strong style={{ color: "var(--t1)" }}>PKR {fmt(totalGross)}</strong></span>
                  <span style={{ color: "var(--t2)" }}>Deductions: <strong style={{ color: "var(--red)" }}>PKR {fmt(totalDeduct)}</strong></span>
                  <span style={{ color: "var(--t2)" }}>Net: <strong style={{ color: "var(--blue)" }}>PKR {fmt(totalNet)}</strong></span>
                </div>
              </div>
            )}

            {/* Employee table */}
            <div style={{ overflowY: "auto", maxHeight: "55vh" }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 13 }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading employees…
                </div>
              ) : error ? (
                <div style={{ padding: 24, color: "var(--red)", fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 15 }} />{error}
                </div>
              ) : rows.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--t2)" }}>
                  <i className="ti ti-users" style={{ fontSize: 32, color: "var(--t3)", display: "block", marginBottom: 10 }} />
                  <div style={{ fontSize: 14 }}>No active employees found</div>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>Add employees in the Employees module first</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                      <th style={{ padding: "8px 14px", width: 40 }}>
                        <input
                          type="checkbox"
                          checked={allChecked && rows.filter(r => !r.alreadyPaid).length > 0}
                          onChange={(e) => toggleAll(e.target.checked)}
                          style={{ cursor: "pointer", width: 14, height: 14 }}
                        />
                      </th>
                      {["Employee", "Gross Salary (PKR)", "Deductions (PKR)", "Net Payable", "Status"].map((h, i) => (
                        <th key={i} style={{ padding: "8px 10px", fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i >= 1 && i <= 3 ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const gross = (parseFloat(row.grossStr) || 0) * 100;
                      const deduct = (parseFloat(row.deductStr) || 0) * 100;
                      const net = gross - deduct;
                      const missingGross = row.checked && !row.alreadyPaid && !(parseFloat(row.grossStr) > 0);

                      return (
                        <tr
                          key={row.employeeId}
                          style={{
                            borderBottom: "0.5px solid var(--b3)",
                            background: row.alreadyPaid ? "var(--bg2)" : row.checked ? "var(--blue-bg)" : "transparent",
                            opacity: row.alreadyPaid ? 0.55 : 1,
                            transition: "background .08s",
                          }}
                        >
                          <td style={{ padding: "10px 14px", width: 40 }}>
                            <input
                              type="checkbox"
                              checked={row.checked}
                              disabled={row.alreadyPaid}
                              onChange={() => toggleRow(idx)}
                              style={{ cursor: row.alreadyPaid ? "not-allowed" : "pointer", width: 14, height: 14 }}
                            />
                          </td>
                          <td style={{ padding: "10px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--green)", flexShrink: 0 }}>
                                {initials(row.name)}
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{row.name}</div>
                                <div style={{ fontSize: 11, color: "var(--t3)" }}>
                                  {[row.designation, row.department].filter(Boolean).join(" · ") || "No department"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "10px 10px", width: 160 }}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={row.grossStr}
                              onChange={(e) => updateRow(idx, "grossStr", e.target.value)}
                              disabled={row.alreadyPaid}
                              placeholder="Enter amount"
                              style={{ ...inputS, borderColor: missingGross ? "var(--red)" : "var(--b3)" }}
                            />
                            {missingGross && <div style={{ fontSize: 10, color: "var(--red)", marginTop: 2, textAlign: "right" }}>Required</div>}
                          </td>
                          <td style={{ padding: "10px 10px", width: 140 }}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={row.deductStr}
                              onChange={(e) => updateRow(idx, "deductStr", e.target.value)}
                              disabled={row.alreadyPaid}
                              style={inputS}
                            />
                          </td>
                          <td style={{ padding: "10px 10px", textAlign: "right", fontSize: 13, fontWeight: 600, color: net > 0 ? "var(--blue)" : "var(--t3)", width: 120 }}>
                            {gross > 0 ? `PKR ${fmt(net)}` : "—"}
                          </td>
                          <td style={{ padding: "10px 14px", width: 110 }}>
                            {row.alreadyPaid ? (
                              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--green-bg)", color: "var(--green)", fontWeight: 600 }}>Paid</span>
                            ) : row.checked ? (
                              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--blue-bg)", color: "var(--blue)", fontWeight: 600 }}>Selected</span>
                            ) : (
                              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--bg2)", color: "var(--t3)", fontWeight: 600 }}>Skipped</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ margin: "0 22px 12px", padding: "10px 12px", background: "var(--red-bg, #FCEBEB)", borderRadius: "var(--rm)", fontSize: 12, color: "var(--red)", display: "flex", gap: 6, alignItems: "center" }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 13 }} />{error}
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: "14px 22px", borderTop: "0.5px solid var(--b3)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, color: "var(--t3)" }}>
                {validToRun > 0
                  ? <>Will pay <strong style={{ color: "var(--t1)" }}>{validToRun}</strong> employee{validToRun !== 1 ? "s" : ""} · PKR {fmt(totalNet)} net{invalidCount > 0 ? <span style={{ color: "var(--amber, #d97706)", marginLeft: 6 }}>({invalidCount} without salary skipped)</span> : null}</>
                  : "No employees selected"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-outline" style={{ height: 34 }} onClick={onClose}>Cancel</button>

                {!confirmOpen ? (
                  <button
                    className="btn-primary"
                    style={{ height: 34, opacity: (validToRun === 0 || running) ? 0.5 : 1 }}
                    disabled={validToRun === 0 || running}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <i className="ti ti-player-play" style={{ fontSize: 12 }} /> Run Payroll ({validToRun})
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--red-bg, #FCEBEB)", border: "0.5px solid var(--red)", borderRadius: "var(--rm)", padding: "4px 10px" }}>
                    <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 500 }}>Confirm? This will mark {selectedRows.length} employee{selectedRows.length !== 1 ? "s" : ""} as paid.</span>
                    <button className="btn-outline" style={{ height: 28, fontSize: 11 }} onClick={() => setConfirmOpen(false)}>No</button>
                    <button
                      className="btn-primary"
                      style={{ height: 28, fontSize: 11, background: "var(--green)" }}
                      onClick={handleRun}
                      disabled={running}
                    >
                      {running ? <><i className="ti ti-loader-2" style={{ fontSize: 11 }} /> Running…</> : "Yes, run it"}
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
