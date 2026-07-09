"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import PayrollDetail from "@frontend/components/payroll/PayrollDetail";
import AddPayrollModal from "@frontend/components/payroll/AddPayrollModal";
import RunPayrollModal from "@frontend/components/payroll/RunPayrollModal";
import Badge from "@frontend/components/ui/Badge";
import { usePayroll, payPayrollRequest, createPayrollRequest, runPayrollBatchRequest } from "@frontend/hooks/usePayroll";
import { useEmployees } from "@frontend/hooks/useEmployees";
import type { PayrollRecord, Employee } from "@frontend/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return (n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtCompact(n: number) {
  const v = n / 100;
  if (v >= 1_000_000) return `PKR ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `PKR ${(v / 1_000).toFixed(0)}K`;
  return `PKR ${v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function periodLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function monthEnd(period: string): Date {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0); // last day of month
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type StatusFilter = "all" | "not_added" | "pending" | "paid";

interface MergedEmployee {
  employee: Employee;
  record: PayrollRecord | null;
}

// ─── Month Navigator ──────────────────────────────────────────────────────────

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
    <div style={{
      display: "flex", alignItems: "center", gap: 2,
      background: "var(--bg1)", border: "0.5px solid var(--b3)",
      borderRadius: "var(--rl)", padding: "4px",
    }}>
      <button
        onClick={prev}
        style={{
          width: 32, height: 32, border: "none", background: "transparent",
          borderRadius: "var(--rm)", cursor: "pointer", color: "var(--t2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background .1s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg2)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <i className="ti ti-chevron-left" style={{ fontSize: 14 }} />
      </button>
      <span style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--t1)", padding: "0 8px", minWidth: 100 }}>
        {periodLabel(period)}
      </span>
      <button
        onClick={next}
        disabled={isNow}
        style={{
          width: 32, height: 32, border: "none", background: "transparent",
          borderRadius: "var(--rm)", cursor: isNow ? "not-allowed" : "pointer",
          color: isNow ? "var(--t3)" : "var(--t2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background .1s",
        }}
        onMouseEnter={(e) => { if (!isNow) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg2)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <i className="ti ti-chevron-right" style={{ fontSize: 14 }} />
      </button>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, iconColor, iconBg }: {
  icon: string; label: string; value: string; sub?: string; iconColor: string; iconBg: string;
}) {
  return (
    <div style={{
      background: "var(--bg1)", border: "0.5px solid var(--b3)",
      borderRadius: "var(--rl)", padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: iconColor }} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Employee Card ────────────────────────────────────────────────────────────

function EmployeeCard({
  employee,
  record,
  isSelected,
  period,
  onSelect,
  onAddPayroll,
  onMarkPaid,
  onCreated,
}: {
  employee: Employee;
  record: PayrollRecord | null;
  isSelected: boolean;
  period: string;
  onSelect: () => void;
  onAddPayroll: (emp: Employee) => void;
  onMarkPaid: (id: string) => void;
  onCreated: (r: PayrollRecord) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreateFromCompensation(e: React.MouseEvent) {
    e.stopPropagation();
    if (!employee.baseSalary) return;
    setCreating(true);
    try {
      const r = await createPayrollRequest({
        employeeId: employee.id,
        period,
        grossPkr: employee.baseSalary / 100,
        taxPkr: employee.defaultTaxPkr ? employee.defaultTaxPkr / 100 : 0,
        deductions: 0,
      });
      onCreated(r);
    } finally {
      setCreating(false);
    }
  }

  const status: "not_added" | "pending" | "paid" = !record
    ? "not_added"
    : record.status === "paid"
    ? "paid"
    : "pending";

  const statusStyle = {
    not_added: { color: "var(--t3)",    bg: "var(--bg3)",       dot: "#9CA3AF" },
    pending:   { color: "#D97706",      bg: "#FEF3C7",          dot: "#D97706" },
    paid:      { color: "var(--green)", bg: "var(--green-bg)",  dot: "#10B981" },
  }[status];

  async function handleMarkPaid(e: React.MouseEvent) {
    e.stopPropagation();
    if (!record) return;
    setPaying(true);
    try {
      await payPayrollRequest(record.id);
      onMarkPaid(record.id);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div
      onClick={record ? onSelect : undefined}
      style={{
        background: "var(--bg1)",
        border: `0.5px solid ${isSelected ? "var(--blue)" : "var(--b3)"}`,
        borderRadius: "var(--rl)",
        overflow: "hidden",
        cursor: record ? "pointer" : "default",
        boxShadow: isSelected ? "0 0 0 2px var(--blue-bg)" : "var(--shadow-sm)",
        transition: "box-shadow .15s, border-color .15s",
      }}
    >
      {/* Card header */}
      <div style={{ padding: "14px 16px 12px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: status === "paid" ? "var(--green-bg)" : status === "pending" ? "#FEF3C7" : "var(--bg2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700,
          color: status === "paid" ? "var(--green)" : status === "pending" ? "#D97706" : "var(--t3)",
          border: `1.5px solid ${status === "paid" ? "var(--green)" : status === "pending" ? "#D97706" : "var(--b3)"}`,
        }}>
          {initials(employee.name)}
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {employee.name}
          </div>
          {(employee.designation || employee.department) && (
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {[employee.designation, employee.department].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>

        {/* Status pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: statusStyle.bg, borderRadius: 20, padding: "3px 9px", flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusStyle.dot }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: statusStyle.color }}>
            {status === "not_added" ? "Not Added" : status === "pending" ? "Pending" : "Paid"}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "0.5px", background: "var(--b3)" }} />

      {/* Amount section */}
      <div style={{ padding: "12px 16px" }}>
        {status === "not_added" ? (
          <div>
            {employee.baseSalary ? (
              <>
                {/* Compensation preview */}
                <div style={{ background: "var(--bg2)", borderRadius: "var(--rm)", padding: "8px 10px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>From Compensation</span>
                    <span style={{ fontSize: 10, color: "var(--blue)", fontWeight: 600 }}>NET: PKR {fmt(employee.baseSalary - (employee.defaultTaxPkr ?? 0))}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--t2)" }}>
                    <span>Gross: <strong>PKR {fmt(employee.baseSalary)}</strong></span>
                    {employee.defaultTaxPkr ? <span>Tax: <strong style={{ color: "#D97706" }}>−{fmt(employee.defaultTaxPkr)}</strong></span> : null}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={handleCreateFromCompensation}
                    disabled={creating}
                    style={{
                      flex: 1, height: 32, border: "none", borderRadius: "var(--rm)",
                      background: "var(--blue)", color: "#fff",
                      fontSize: 12, fontWeight: 600, cursor: creating ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      opacity: creating ? 0.7 : 1,
                    }}
                  >
                    {creating
                      ? <><i className="ti ti-loader-2" style={{ fontSize: 11 }} /> Creating…</>
                      : <><i className="ti ti-bolt" style={{ fontSize: 11 }} /> Create Record</>
                    }
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddPayroll(employee); }}
                    title="Edit amounts before creating"
                    style={{
                      width: 32, height: 32, border: "0.5px solid var(--b3)", borderRadius: "var(--rm)",
                      background: "var(--bg2)", color: "var(--t2)",
                      fontSize: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <i className="ti ti-pencil" style={{ fontSize: 12 }} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 10 }}>
                  No compensation set.{" "}
                  <a href="/compensation" style={{ color: "var(--blue)", textDecoration: "none", fontWeight: 500 }}>Set it →</a>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddPayroll(employee); }}
                  style={{
                    width: "100%", height: 32, border: "0.5px dashed var(--b3)",
                    borderRadius: "var(--rm)", background: "var(--bg2)",
                    fontSize: 12, color: "var(--t2)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <i className="ti ti-plus" style={{ fontSize: 13 }} />
                  Add Manually
                </button>
              </>
            )}
          </div>
        ) : record ? (
          <div>
            {/* Salary breakdown */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Gross</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t2)" }}>PKR {fmt(record.grossPkr)}</div>
              </div>
              {record.taxPkr > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Tax</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#D97706" }}>−{fmt(record.taxPkr)}</div>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Net</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: status === "paid" ? "var(--green)" : "var(--t1)" }}>PKR {fmt(record.netPkr)}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              {status === "pending" && (
                <button
                  onClick={handleMarkPaid}
                  disabled={paying}
                  style={{
                    flex: 1, height: 32, border: "none", borderRadius: "var(--rm)",
                    background: "var(--green)", color: "#fff",
                    fontSize: 12, fontWeight: 600, cursor: paying ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    opacity: paying ? 0.7 : 1,
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: 12 }} />
                  {paying ? "Processing…" : "Mark Paid"}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                style={{
                  flex: 1, height: 32, border: "0.5px solid var(--b3)", borderRadius: "var(--rm)",
                  background: "var(--bg2)", color: "var(--t2)",
                  fontSize: 12, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                }}
              >
                <i className="ti ti-eye" style={{ fontSize: 12 }} />
                View Detail
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Status filter tabs ───────────────────────────────────────────────────────

const FILTERS: { label: string; value: StatusFilter; icon: string }[] = [
  { label: "All",       value: "all",       icon: "ti-layout-grid" },
  { label: "Not Added", value: "not_added", icon: "ti-user-plus"   },
  { label: "Pending",   value: "pending",   icon: "ti-clock"       },
  { label: "Paid",      value: "paid",      icon: "ti-circle-check" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [addPrefill, setAddPrefill] = useState<{ employeeId?: string; grossPkr?: number; defaultTaxPkr?: number } | undefined>();

  // Data — active employees only; DB records are preserved when employees are deactivated
  const { employees, loading: empLoading } = useEmployees("", "active", 1, 200);
  const { data, loading: payLoading, refetch } = usePayroll({ status: "all", period });
  const records = data?.items ?? [];

  // Merge active employees with their payroll record for this period
  const merged: MergedEmployee[] = useMemo(() => {
    const end = monthEnd(period);
    return employees
      .filter((emp) => !emp.joinDate || new Date(emp.joinDate) <= end)
      .map((emp) => ({
        employee: emp,
        record: records.find((r) => r.employee?.id === emp.id) ?? null,
      }));
  }, [employees, records, period]);

  // Apply status filter
  const filtered = useMemo(() => {
    if (filter === "all") return merged;
    if (filter === "not_added") return merged.filter((m) => !m.record);
    return merged.filter((m) => m.record?.status === filter);
  }, [merged, filter]);

  // Selected record
  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? null;

  // Metrics
  const paidRecords   = records.filter((r) => r.status === "paid");
  const pendingRecords = records.filter((r) => r.status === "pending");
  const totalGross    = records.reduce((s, r) => s + r.grossPkr, 0);
  const totalNet      = records.reduce((s, r) => s + r.netPkr, 0);
  const notAddedCount = merged.filter((m) => !m.record).length;

  // Filter counts for tabs
  const counts: Record<StatusFilter, number> = {
    all:       merged.length,
    not_added: notAddedCount,
    pending:   pendingRecords.length,
    paid:      paidRecords.length,
  };

  function openAddForEmployee(emp: Employee) {
    setAddPrefill({
      employeeId: emp.id,
      grossPkr: emp.baseSalary ? emp.baseSalary / 100 : undefined,
      defaultTaxPkr: emp.defaultTaxPkr ? emp.defaultTaxPkr / 100 : undefined,
    });
    setShowAdd(true);
  }

  function handleCreated(record: PayrollRecord) {
    refetch();
    setSelectedRecordId(record.id);
  }

  function handleMarkPaid() {
    refetch();
    setSelectedRecordId(null);
  }

  // Auto-create all from compensation
  const [autoCreating, setAutoCreating] = useState(false);
  const unprocessedWithCompensation = merged.filter((m) => !m.record && m.employee.baseSalary);

  async function handleAutoCreate() {
    if (unprocessedWithCompensation.length === 0) return;
    setAutoCreating(true);
    try {
      await runPayrollBatchRequest(
        period,
        unprocessedWithCompensation.map(({ employee: emp }) => ({
          employeeId: emp.id,
          grossPkr: emp.baseSalary! / 100,
          taxPkr: emp.defaultTaxPkr ? emp.defaultTaxPkr / 100 : 0,
          deductions: 0,
        }))
      );
      refetch();
    } finally {
      setAutoCreating(false);
    }
  }

  const loading = empLoading || payLoading;

  // Auto-create records for all unprocessed employees with compensation on load
  const autoRunRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    if (unprocessedWithCompensation.length === 0) return;
    if (autoRunRef.current === period) return;
    autoRunRef.current = period;
    runPayrollBatchRequest(
      period,
      unprocessedWithCompensation.map(({ employee: emp }) => ({
        employeeId: emp.id,
        grossPkr: emp.baseSalary! / 100,
        taxPkr: emp.defaultTaxPkr ? emp.defaultTaxPkr / 100 : 0,
        deductions: 0,
      }))
    ).then(() => refetch()).catch(() => {});
  }, [loading, period, unprocessedWithCompensation.length]);

  return (
    <>
      <style>{`
        @keyframes drawerIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <Topbar title="Payroll" />

      <div className="page-content">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="payroll-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          {/* Month nav + action buttons */}
          <div className="payroll-controls" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <MonthNav period={period} onChange={(p) => { setPeriod(p); setSelectedRecordId(null); }} />

            <div style={{ width: "0.5px", height: 24, background: "var(--b3)", flexShrink: 0 }} />

            <div className="page-actions" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {unprocessedWithCompensation.length > 0 && (
                <button
                  className="btn-primary"
                  style={{ height: 34, fontSize: 12, paddingInline: 12, background: "var(--green)", borderColor: "var(--green)", whiteSpace: "nowrap" }}
                  onClick={handleAutoCreate}
                  disabled={autoCreating}
                >
                  {autoCreating
                    ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Creating…</>
                    : <><i className="ti ti-bolt" style={{ fontSize: 12 }} /> Create All ({unprocessedWithCompensation.length})</>
                  }
                </button>
              )}
              <button className="btn-outline" style={{ height: 34, fontSize: 12, paddingInline: 12, whiteSpace: "nowrap" }} onClick={() => setShowRun(true)}>
                <i className="ti ti-player-play" style={{ fontSize: 12 }} /> Run Payroll
              </button>
              <button className="btn-outline" style={{ height: 34, fontSize: 12, paddingInline: 12, whiteSpace: "nowrap" }} onClick={() => { setAddPrefill(undefined); setShowAdd(true); }}>
                <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add Record
              </button>
            </div>
          </div>
        </div>

        {/* ── Summary bar ─────────────────────────────────────────────────── */}
        <div className="stat-bar">
          <div className="stat-bar-item">
            <div className="stat-bar-label">Total Gross</div>
            <div className="stat-bar-value" style={{ color: "var(--blue)" }}>{fmtCompact(totalGross)}</div>
            <div className="stat-bar-sub">{records.length} record{records.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="stat-bar-item">
            <div className="stat-bar-label">Net Payroll</div>
            <div className="stat-bar-value" style={{ color: "var(--green)" }}>{fmtCompact(totalNet)}</div>
            <div className="stat-bar-sub">Total take-home</div>
          </div>
          <div className="stat-bar-item">
            <div className="stat-bar-label">Pending</div>
            <div className="stat-bar-value" style={{ color: pendingRecords.length > 0 ? "#D97706" : "var(--t3)" }}>{pendingRecords.length}</div>
            <div className="stat-bar-sub">{pendingRecords.length > 0 ? fmtCompact(pendingRecords.reduce((s, r) => s + r.netPkr, 0)) : "All clear"}</div>
          </div>
          <div className="stat-bar-item">
            <div className="stat-bar-label">Not Added</div>
            <div className="stat-bar-value" style={{ color: notAddedCount > 0 ? "var(--red)" : "var(--green)" }}>{notAddedCount}</div>
            <div className="stat-bar-sub">{notAddedCount > 0 ? `${merged.length} eligible` : "Everyone added"}</div>
          </div>
        </div>

        {/* ── Status filter tabs ───────────────────────────────────────────── */}
        <div className="payroll-filter-bar" style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "var(--bg2)", border: "0.5px solid var(--b3)",
          borderRadius: "var(--rm)", padding: "3px",
          marginBottom: 16,
        }}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: "var(--rm)", border: "none",
                  cursor: "pointer", transition: "all .12s", whiteSpace: "nowrap",
                  background: active ? "var(--bg1)" : "transparent",
                  color: active ? "var(--t1)" : "var(--t3)",
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <i className={`ti ${f.icon}`} style={{ fontSize: 12, color: active ? "var(--blue)" : "var(--t3)" }} />
                {f.label}
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                  background: active ? "var(--blue-bg)" : "var(--bg3)",
                  color: active ? "var(--blue)" : "var(--t3)",
                }}>
                  {counts[f.value]}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Employee Grid ────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "80px 0", color: "var(--t3)" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 24 }} />
            <span style={{ fontSize: 13 }}>Loading employees…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--t3)" }}>
            <i className="ti ti-users" style={{ fontSize: 40, display: "block", marginBottom: 14, opacity: 0.4 }} />
            <div style={{ fontSize: 14, color: "var(--t2)", fontWeight: 500, marginBottom: 4 }}>
              {filter === "not_added" ? "All employees have records this month" :
               filter === "pending"   ? "No pending payroll records" :
               filter === "paid"      ? "No paid records yet" :
               "No employees found"}
            </div>
            <div style={{ fontSize: 12 }}>
              {filter !== "all" ? "Try switching to All to see everyone" : "Add employees in the Employees module"}
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}>
            {filtered.map(({ employee, record }) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                record={record}
                isSelected={!!record && record.id === selectedRecordId}
                period={period}
                onSelect={() => setSelectedRecordId(record?.id ?? null)}
                onAddPayroll={openAddForEmployee}
                onMarkPaid={() => { refetch(); }}
                onCreated={handleCreated}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Drawer ────────────────────────────────────────────────── */}
      {selectedRecordId && selectedRecord && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 200, backdropFilter: "blur(2px)" }}
            onClick={() => setSelectedRecordId(null)}
          />
          <div className="drawer-panel" style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
            background: "var(--bg2)", borderLeft: "0.5px solid var(--b3)",
            zIndex: 201, display: "flex", flexDirection: "column",
            boxShadow: "-12px 0 48px rgba(0,0,0,0.12)",
            animation: "drawerIn 0.2s cubic-bezier(0.22,1,0.36,1)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderBottom: "0.5px solid var(--b3)",
              background: "var(--bg1)", flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Payroll Detail
              </span>
              <button
                onClick={() => setSelectedRecordId(null)}
                style={{ width: 28, height: 28, border: "none", background: "var(--bg2)", borderRadius: 6, cursor: "pointer", color: "var(--t2)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className="ti ti-x" style={{ fontSize: 14 }} />
              </button>
            </div>
            <PayrollDetail record={selectedRecord} loading={false} onPaid={handleMarkPaid} onReverted={handleMarkPaid} onUpdated={refetch} />
          </div>
        </>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AddPayrollModal
        open={showAdd}
        onClose={() => { setShowAdd(false); setAddPrefill(undefined); }}
        onCreated={handleCreated}
        prefill={addPrefill}
      />
      <RunPayrollModal
        open={showRun}
        onClose={() => setShowRun(false)}
        initialPeriod={period}
        onCompleted={(p) => {
          if (p !== period) setPeriod(p);
          else refetch();
        }}
      />
    </>
  );
}
