"use client";

import Badge from "@frontend/components/ui/Badge";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import type { PayrollRecord } from "@frontend/types";

type FilterStatus = "all" | "pending" | "paid";

interface PayrollListProps {
  records: PayrollRecord[];
  selectedId: string | null;
  filter: FilterStatus;
  period: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onFilterChange: (f: FilterStatus) => void;
  onPeriodChange: (p: string) => void;
  onAddClick: () => void;
  onRunClick: () => void;
}

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
];

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function getRecipientName(rec: PayrollRecord): string {
  return rec.user?.name ?? rec.employee?.name ?? "Unknown";
}

function getRecipientSubtitle(rec: PayrollRecord): string {
  if (rec.user) return `${rec.period} · ${rec.user.role.replace(/_/g, " ")}`;
  if (rec.employee) {
    const suffix = rec.employee.designation ?? rec.employee.department;
    return suffix ? `${rec.period} · ${suffix}` : rec.period;
  }
  return rec.period;
}

function getAvatarUrl(rec: PayrollRecord): string | null {
  return rec.user?.avatarUrl ?? null;
}

export default function PayrollList({
  records,
  selectedId,
  filter,
  period,
  loading,
  onSelect,
  onFilterChange,
  onPeriodChange,
  onAddClick,
  onRunClick,
}: PayrollListProps) {
  const totalNet = records.reduce((sum, r) => sum + r.netPkr, 0);

  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        background: "var(--bg1)",
        borderRight: "0.5px solid var(--b3)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--b3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>
            Payroll{" "}
            <span style={{ fontSize: 11, color: "var(--t2)", fontWeight: 400 }}>
              {records.length} records
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn-outline" style={{ height: 28, fontSize: 11 }} onClick={onRunClick}>
              <i className="ti ti-player-play" style={{ fontSize: 11 }} /> Run
            </button>
            <button className="btn-primary" style={{ height: 28, fontSize: 11 }} onClick={onAddClick}>
              <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add
            </button>
          </div>
        </div>
        <PeriodSelect value={period} onChange={onPeriodChange} includeAll allLabel="All periods" style={{ width: "100%" }} />
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 5, padding: "9px 16px", borderBottom: "0.5px solid var(--b3)" }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            style={{
              fontSize: 11,
              padding: "3px 9px",
              borderRadius: 20,
              border: `0.5px solid ${filter === f.value ? "#85B7EB" : "var(--b3)"}`,
              cursor: "pointer",
              color: filter === f.value ? "var(--blue)" : "var(--t2)",
              background: filter === f.value ? "var(--blue-bg)" : "transparent",
              transition: "all .1s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Total banner */}
      {records.length > 0 && (
        <div style={{ padding: "8px 16px", borderBottom: "0.5px solid var(--b3)", background: "var(--bg2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--t2)" }}>Total net payroll</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>PKR {fmt(totalNet / 100)}</span>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--t3)", fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 20, marginRight: 8 }} />
            Loading…
          </div>
        ) : records.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "var(--t2)", gap: 8 }}>
            <i className="ti ti-users" style={{ fontSize: 28, color: "var(--t3)" }} />
            <p style={{ fontSize: 13 }}>No payroll records</p>
          </div>
        ) : (
          records.map((rec) => {
            const name = getRecipientName(rec);
            const avatarUrl = getAvatarUrl(rec);
            return (
              <div
                key={rec.id}
                onClick={() => onSelect(rec.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 16px",
                  borderBottom: "0.5px solid var(--b3)",
                  cursor: "pointer",
                  background: rec.id === selectedId ? "var(--blue-bg)" : "transparent",
                  transition: "background .1s",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: rec.employee ? "var(--green-bg)" : "var(--blue-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    color: rec.employee ? "var(--green)" : "var(--blue)",
                    overflow: "hidden",
                  }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: 32, height: 32, objectFit: "cover" }} />
                  ) : (
                    getInitials(name)
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1 }}>
                    {getRecipientSubtitle(rec)}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", marginBottom: 3 }}>
                    PKR {fmt(rec.netPkr / 100)}
                  </div>
                  <Badge status={rec.status} size="sm" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
