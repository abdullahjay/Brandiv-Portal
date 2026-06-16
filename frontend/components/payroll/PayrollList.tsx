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
}

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
];

function fmt(n: number) {
  return (n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function getRecipientName(rec: PayrollRecord) {
  return rec.user?.name ?? rec.employee?.name ?? "Unknown";
}

function getRecipientSub(rec: PayrollRecord) {
  if (rec.employee) return rec.employee.designation ?? rec.employee.department ?? "Employee";
  if (rec.user) return rec.user.role.replace(/_/g, " ");
  return "";
}

const COL: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  color: "var(--t1)",
  verticalAlign: "middle",
  borderBottom: "0.5px solid var(--b3)",
};

const TH: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--t3)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  textAlign: "left",
  background: "var(--bg2)",
  borderBottom: "0.5px solid var(--b3)",
  whiteSpace: "nowrap",
};

export default function PayrollList({
  records,
  selectedId,
  filter,
  period,
  loading,
  onSelect,
  onFilterChange,
  onPeriodChange,
}: PayrollListProps) {
  return (
    <div style={{
      background: "var(--bg1)",
      border: "0.5px solid var(--b3)",
      borderRadius: "var(--rl)",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
    }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "0.5px solid var(--b3)",
        gap: 12,
        flexWrap: "wrap",
        background: "var(--bg1)",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              style={{
                fontSize: 12, padding: "4px 13px", borderRadius: 20,
                border: `0.5px solid ${filter === f.value ? "var(--blue)" : "var(--b3)"}`,
                cursor: "pointer",
                color: filter === f.value ? "var(--blue)" : "var(--t2)",
                background: filter === f.value ? "var(--blue-bg)" : "transparent",
                fontWeight: filter === f.value ? 600 : 400,
                transition: "all .12s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PeriodSelect value={period} onChange={onPeriodChange} includeAll allLabel="All periods" style={{ height: 30, fontSize: 12 }} />
          <span style={{ fontSize: 11, color: "var(--t3)" }}>
            {records.length} record{records.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: "28%" }}>Employee</th>
              <th style={{ ...TH, textAlign: "center", width: "11%" }}>Period</th>
              <th style={{ ...TH, textAlign: "right", width: "13%" }}>Gross (PKR)</th>
              <th style={{ ...TH, textAlign: "right", width: "11%" }}>Tax</th>
              <th style={{ ...TH, textAlign: "right", width: "12%" }}>Deductions</th>
              <th style={{ ...TH, textAlign: "right", width: "13%" }}>Net Payable</th>
              <th style={{ ...TH, textAlign: "center", width: "12%" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ ...COL, textAlign: "center", padding: "52px 16px", color: "var(--t3)" }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 24, display: "block", marginBottom: 10 }} />
                  <span style={{ fontSize: 12 }}>Loading payroll records…</span>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...COL, textAlign: "center", padding: "60px 16px", color: "var(--t3)" }}>
                  <i className="ti ti-users" style={{ fontSize: 34, display: "block", marginBottom: 12, opacity: 0.5 }} />
                  <div style={{ fontSize: 14, color: "var(--t2)", marginBottom: 4, fontWeight: 500 }}>No payroll records</div>
                  <div style={{ fontSize: 12 }}>Run payroll or add a record to get started</div>
                </td>
              </tr>
            ) : (
              records.map((rec) => {
                const name = getRecipientName(rec);
                const sub = getRecipientSub(rec);
                const isSelected = rec.id === selectedId;
                const isEmployee = !!rec.employee;

                return (
                  <tr
                    key={rec.id}
                    onClick={() => onSelect(rec.id)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "var(--blue-bg)" : "transparent",
                      transition: "background .1s",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg2)"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    <td style={COL}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: isEmployee ? "var(--green-bg)" : "var(--blue-bg)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700,
                          color: isEmployee ? "var(--green)" : "var(--blue)",
                          overflow: "hidden",
                        }}>
                          {rec.user?.avatarUrl
                            ? <img src={rec.user.avatarUrl} alt="" style={{ width: 34, height: 34, objectFit: "cover" }} />
                            : getInitials(name)
                          }
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {name}
                          </div>
                          {sub && (
                            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {sub}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ ...COL, textAlign: "center" }}>
                      <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: "var(--gray-bg)", color: "var(--gray)", fontWeight: 500 }}>
                        {rec.period}
                      </span>
                    </td>

                    <td style={{ ...COL, textAlign: "right", color: "var(--t2)", fontSize: 12 }}>
                      {fmt(rec.grossPkr)}
                    </td>

                    <td style={{ ...COL, textAlign: "right", fontSize: 12 }}>
                      {rec.taxPkr > 0
                        ? <span style={{ color: "var(--amber)" }}>−{fmt(rec.taxPkr)}</span>
                        : <span style={{ color: "var(--t3)" }}>—</span>}
                    </td>

                    <td style={{ ...COL, textAlign: "right", fontSize: 12 }}>
                      {rec.deductions > 0
                        ? <span style={{ color: "var(--red)" }}>−{fmt(rec.deductions)}</span>
                        : <span style={{ color: "var(--t3)" }}>—</span>}
                    </td>

                    <td style={{ ...COL, textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>
                        {fmt(rec.netPkr)}
                      </span>
                    </td>

                    <td style={{ ...COL, textAlign: "center" }}>
                      <Badge status={rec.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
