"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@frontend/components/layout/Topbar";
import Modal from "@frontend/components/ui/Modal";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import type { EmployeeWithCompensations, ApiResponse } from "@frontend/types";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString("default", { month: "short", year: "numeric" });
}

function fmtPkr(v: number | null) {
  if (!v) return "—";
  return `PKR ${(v / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function fmtNum(v: number | null) {
  if (!v) return "—";
  return (v / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function getEffective(emp: EmployeeWithCompensations, period: string) {
  const matching = emp.compensations.filter((c) => c.effectiveFrom <= period);
  if (matching.length > 0) return matching[0];
  if (emp.baseSalary || emp.defaultTaxPkr) {
    return {
      id: "__legacy__",
      baseSalary: emp.baseSalary ?? 0,
      defaultTaxPkr: emp.defaultTaxPkr ?? 0,
      effectiveFrom: null as string | null,
      notes: null,
    };
  }
  return null;
}

interface SetCompModalProps {
  open: boolean;
  onClose: () => void;
  employee: EmployeeWithCompensations | null;
  onSaved: () => void;
}

function SetCompModal({ open, onClose, employee, onSaved }: SetCompModalProps) {
  const [effectiveFrom, setEffectiveFrom] = useState(currentPeriod());
  const [grossPkr, setGrossPkr] = useState("");
  const [taxPkr, setTaxPkr] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !employee) return;
    setEffectiveFrom(currentPeriod());
    setError(null);
    const latest = employee.compensations[0];
    if (latest) {
      setGrossPkr(String(latest.baseSalary / 100));
      setTaxPkr(String(latest.defaultTaxPkr / 100));
      setNotes("");
    } else {
      setGrossPkr(employee.baseSalary ? String(employee.baseSalary / 100) : "");
      setTaxPkr(employee.defaultTaxPkr ? String(employee.defaultTaxPkr / 100) : "0");
      setNotes("");
    }
  }, [open, employee]);

  const gross = parseFloat(grossPkr) || 0;
  const tax = parseFloat(taxPkr) || 0;
  const net = Math.max(0, gross - tax);

  async function handleSave() {
    if (!employee) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/compensation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.id, effectiveFrom, baseSalary: gross, defaultTaxPkr: tax, notes: notes || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to save");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={handleSave} disabled={saving || gross <= 0} style={{ opacity: gross > 0 ? 1 : 0.5 }}>
        {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save</>}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title={employee ? `Set Compensation — ${employee.name}` : "Set Compensation"} footer={footer}>
      {error && <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>{error}</div>}

      <div className="frow">
        <label>Effective From <span style={{ color: "var(--red)" }}>*</span></label>
        <PeriodSelect value={effectiveFrom} onChange={setEffectiveFrom} style={{ width: "100%" }} />
        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
          Payroll from this month onwards uses these values. Past payrolls are not affected.
        </div>
      </div>

      <div className="f2" style={{ marginTop: 14 }}>
        <div className="frow">
          <label>Base Salary (PKR) <span style={{ color: "var(--red)" }}>*</span></label>
          <input type="number" min="0" step="1" value={grossPkr} onChange={(e) => setGrossPkr(e.target.value)} placeholder="e.g. 150000" />
        </div>
        <div className="frow">
          <label>Income Tax (PKR)</label>
          <input type="number" min="0" step="1" value={taxPkr} onChange={(e) => setTaxPkr(e.target.value)} placeholder="0" />
        </div>
      </div>

      {gross > 0 && (
        <div style={{ background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rm)", padding: "10px 14px", margin: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--green)" }}>Net payable from {periodLabel(effectiveFrom)}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>PKR {net.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      )}

      <div className="frow" style={{ marginTop: 4 }}>
        <label>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Annual revision, promotion…" style={{ minHeight: 56 }} />
      </div>
    </Modal>
  );
}

export default function CompensationPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<EmployeeWithCompensations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [viewPeriod, setViewPeriod] = useState(currentPeriod());
  const [selectedEmp, setSelectedEmp] = useState<EmployeeWithCompensations | null>(null);
  const [showSetComp, setShowSetComp] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canEdit = ["super_admin", "admin", "finance"].includes(session?.user?.role ?? "");
  const canDelete = ["super_admin", "admin"].includes(session?.user?.role ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compensation");
      const json: ApiResponse<EmployeeWithCompensations[]> = await res.json();
      if (json.success && json.data) setEmployees(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(compId: string) {
    setDeletingId(compId);
    try {
      const res = await fetch(`/api/compensation/${compId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) load();
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = employees.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (!search) return true;
    return e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.department ?? "").toLowerCase().includes(search.toLowerCase());
  });

  // Summary totals count active employees only
  const activeEmployees = employees.filter((e) => e.status === "active");
  const effectiveList = activeEmployees.map((emp) => getEffective(emp, viewPeriod));
  const totalGross = effectiveList.reduce((s, c) => s + (c?.baseSalary ?? 0), 0);
  const totalTax = effectiveList.reduce((s, c) => s + (c?.defaultTaxPkr ?? 0), 0);
  const totalNet = totalGross - totalTax;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg2)" }}>
      <Topbar title="Compensation" />
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)", marginBottom: 2 }}>Compensation</h1>
            <p style={{ fontSize: 12, color: "var(--t3)" }}>
              Set effective salary & tax per employee. Changes apply from the chosen month — past payrolls are never affected.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: "var(--t3)" }}>Preview period:</span>
            <PeriodSelect value={viewPeriod} onChange={setViewPeriod} />
          </div>
        </div>

        {/* Summary */}
        <div className="metrics-3">
          {[
            { label: "Total Gross", value: fmtPkr(totalGross), icon: "ti-cash", color: "var(--blue)", bg: "var(--blue-bg)" },
            { label: "Total Tax", value: fmtPkr(totalTax), icon: "ti-receipt-tax", color: "#D97706", bg: "#FFF7ED" },
            { label: "Total Net", value: fmtPkr(totalNet), icon: "ti-wallet", color: "var(--green)", bg: "var(--green-bg)" },
          ].map((c) => (
            <div key={c.label} style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow-sm)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${c.icon}`} style={{ fontSize: 20, color: c.color }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 4 }}>{c.label} — {periodLabel(viewPeriod)} <span style={{ opacity: 0.7 }}>(active only)</span></div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--t3)", pointerEvents: "none" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…" style={{ paddingLeft: 30, width: "100%", height: 32, fontSize: 13 }} />
            </div>
            {/* Status filter */}
            <div style={{ display: "flex", gap: 4, background: "var(--bg2)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: 3 }}>
              {(["active", "inactive", "all"] as const).map((s) => {
                const label = s === "all" ? "All" : s === "active" ? "Active" : "Inactive";
                const count = s === "all" ? employees.length : employees.filter(e => e.status === s).length;
                const isActive = statusFilter === s;
                return (
                  <button key={s} onClick={() => setStatusFilter(s)} style={{ height: 26, padding: "0 10px", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: isActive ? 600 : 400, background: isActive ? "var(--bg1)" : "transparent", color: isActive ? "var(--t1)" : "var(--t3)", boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none", display: "flex", alignItems: "center", gap: 4, transition: "all .1s" }}>
                    {label}
                    <span style={{ fontSize: 10, background: isActive ? "var(--blue-bg)" : "var(--bg3)", color: isActive ? "var(--blue)" : "var(--t3)", borderRadius: 9, padding: "0 5px", fontWeight: 600 }}>{count}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginLeft: "auto" }}>{filtered.length} shown</div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
              <i className="ti ti-loader-2" style={{ fontSize: 18, marginBottom: 8, display: "block", animation: "spin 0.7s linear infinite" }} />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>No employees found.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--b3)" }}>
                  {["Employee", "Effective From", "Base Salary (PKR)", "Tax (PKR)", "Net Payable", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "var(--t3)", textAlign: "left", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const eff = getEffective(emp, viewPeriod);
                  const gross = eff?.baseSalary ?? 0;
                  const tax = eff?.defaultTaxPkr ?? 0;
                  const net = Math.max(0, gross - tax) / 100;
                  const isExpanded = expandedId === emp.id;
                  const futureRecords = emp.compensations.filter((c) => c.effectiveFrom > viewPeriod);
                  const pastRecords = emp.compensations.filter((c) => c.effectiveFrom <= viewPeriod);

                  return (
                    <React.Fragment key={emp.id}>
                      <tr style={{ borderBottom: isExpanded ? "none" : "0.5px solid var(--b3)", background: isExpanded ? "var(--bg2)" : "transparent" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{emp.name}</span>
                            {emp.status === "inactive" && (
                              <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 20, background: "var(--bg3)", color: "var(--t3)", fontWeight: 700, border: "0.5px solid var(--b3)", flexShrink: 0 }}>Inactive</span>
                            )}
                          </div>
                          {(emp.designation || emp.department) && (
                            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{[emp.designation, emp.department].filter(Boolean).join(" · ")}</div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {eff?.effectiveFrom ? (
                            <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 500 }}>{periodLabel(eff.effectiveFrom)}</span>
                          ) : eff ? (
                            <span style={{ fontSize: 11, color: "var(--t3)", fontStyle: "italic" }}>Legacy</span>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--t3)" }}>Not set</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 13, color: gross > 0 ? "var(--t1)" : "var(--t3)" }}>{gross > 0 ? fmtNum(gross) : "—"}</span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 13, color: tax > 0 ? "#D97706" : "var(--t3)" }}>{tax > 0 ? fmtNum(tax) : "—"}</span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 13, fontWeight: gross > 0 ? 600 : 400, color: gross > 0 ? "var(--green)" : "var(--t3)" }}>
                            {gross > 0 ? net.toLocaleString("en-PK", { maximumFractionDigits: 0 }) : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                            {emp.compensations.length > 0 && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                                style={{ fontSize: 11, color: "var(--t3)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                              >
                                <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-history"}`} style={{ fontSize: 12 }} />
                                {isExpanded ? "Hide" : `History (${emp.compensations.length})`}
                              </button>
                            )}
                            {canEdit && (
                              <button
                                className="btn-primary"
                                style={{ height: 28, fontSize: 11, padding: "0 12px" }}
                                onClick={() => { setSelectedEmp(emp); setShowSetComp(true); }}
                              >
                                <i className="ti ti-plus" style={{ fontSize: 11 }} /> Set Compensation
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${emp.id}-hist`} style={{ borderBottom: "0.5px solid var(--b3)" }}>
                          <td colSpan={6} style={{ padding: "0 16px 12px 48px", background: "var(--bg2)" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 10, marginBottom: 8 }}>Compensation History</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {futureRecords.length > 0 && (
                                <div style={{ fontSize: 10, color: "var(--blue)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>UPCOMING</div>
                              )}
                              {[...futureRecords, ...pastRecords].map((c) => {
                                const isFuture = c.effectiveFrom > viewPeriod;
                                const isCurrent = eff?.effectiveFrom === c.effectiveFrom;
                                const cGross = c.baseSalary / 100;
                                const cTax = c.defaultTaxPkr / 100;
                                const cNet = Math.max(0, cGross - cTax);
                                return (
                                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "7px 10px", borderRadius: "var(--rm)", background: isCurrent ? "var(--blue-bg)" : isFuture ? "#FFFBEB" : "var(--bg1)", border: `0.5px solid ${isCurrent ? "var(--blue)" : isFuture ? "#FCD34D" : "var(--b3)"}` }}>
                                    <div style={{ minWidth: 90 }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: isFuture ? "#D97706" : isCurrent ? "var(--blue)" : "var(--t2)" }}>
                                        {periodLabel(c.effectiveFrom)}
                                        {isCurrent && <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 400, color: "var(--blue)" }}>(current)</span>}
                                        {isFuture && <span style={{ fontSize: 10, marginLeft: 4, fontWeight: 400, color: "#D97706" }}>(upcoming)</span>}
                                      </div>
                                    </div>
                                    <div style={{ flex: 1, display: "flex", gap: 16, fontSize: 12, color: "var(--t2)" }}>
                                      <span>Gross: <strong style={{ color: "var(--t1)" }}>PKR {cGross.toLocaleString()}</strong></span>
                                      {cTax > 0 && <span>Tax: <strong style={{ color: "#D97706" }}>PKR {cTax.toLocaleString()}</strong></span>}
                                      <span>Net: <strong style={{ color: "var(--green)" }}>PKR {cNet.toLocaleString()}</strong></span>
                                    </div>
                                    {c.notes && <span style={{ fontSize: 11, color: "var(--t3)", fontStyle: "italic", flex: "0 0 auto", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</span>}
                                    {canDelete && (
                                      <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} title="Delete this record"
                                        style={{ width: 24, height: 24, border: "none", background: "none", cursor: "pointer", color: "var(--red)", opacity: deletingId === c.id ? 0.5 : 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <i className="ti ti-trash" style={{ fontSize: 12 }} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

      <SetCompModal open={showSetComp} onClose={() => setShowSetComp(false)} employee={selectedEmp} onSaved={load} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
