"use client";

import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import type { Expense } from "@frontend/types";

interface ExpenseListProps {
  expenses: Expense[];
  selectedId: string | null;
  search: string;
  category: string;
  period: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onSearchChange: (s: string) => void;
  onCategoryChange: (c: string) => void;
  onPeriodChange: (p: string) => void;
}

const CATEGORY_META: Record<string, { color: string; bg: string; icon: string }> = {
  "Salaries":                  { color: "#10B981", bg: "#d1fae5", icon: "ti-users" },
  "Office Rent":               { color: "#6366F1", bg: "#ede9fe", icon: "ti-building" },
  "Software & Subscriptions":  { color: "#0EA5E9", bg: "#e0f2fe", icon: "ti-device-laptop" },
  "Freelancer / Contractor":   { color: "#F59E0B", bg: "#fef3c7", icon: "ti-user-check" },
  "Marketing & Ads":           { color: "#EC4899", bg: "#fce7f3", icon: "ti-speakerphone" },
  "Equipment & Hardware":      { color: "#8B5CF6", bg: "#ede9fe", icon: "ti-device-desktop" },
  "Travel":                    { color: "#14B8A6", bg: "#ccfbf1", icon: "ti-plane" },
  "Utilities":                 { color: "#F97316", bg: "#ffedd5", icon: "ti-bolt" },
  "Legal & Professional":      { color: "#6B7280", bg: "#f3f4f6", icon: "ti-scale" },
  "Banking & Fees":            { color: "#EF4444", bg: "#fee2e2", icon: "ti-credit-card" },
  "Other":                     { color: "#9CA3AF", bg: "#f9fafb", icon: "ti-dots" },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META);

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { color: "#9CA3AF", bg: "#f9fafb", icon: "ti-tag" };
}

function fmt(n: number) {
  return (n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

function ExpenseMobileCard({ exp, selected, onClick }: { exp: Expense; selected: boolean; onClick: () => void }) {
  const meta = getCategoryMeta(exp.category);
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        borderBottom: "0.5px solid var(--b3)",
        background: selected ? "var(--blue-bg)" : "transparent",
        cursor: "pointer",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={`ti ${meta.icon}`} style={{ fontSize: 16, color: meta.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {exp.description}
        </div>
        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {exp.category} · {fmtDate(exp.date)}{exp.project?.name ? ` · ${exp.project.name}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>
          PKR {fmt(exp.amountPkr)}
        </div>
        <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>{exp.period}</div>
      </div>
    </div>
  );
}

export default function ExpenseList({
  expenses,
  selectedId,
  search,
  category,
  period,
  loading,
  onSelect,
  onSearchChange,
  onCategoryChange,
  onPeriodChange,
}: ExpenseListProps) {
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
        gap: 10,
        padding: "12px 16px",
        borderBottom: "0.5px solid var(--b3)",
        flexWrap: "wrap",
        background: "var(--bg1)",
      }}>
        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "var(--bg2)", border: "0.5px solid var(--b3)",
          borderRadius: "var(--rm)", padding: "0 10px", height: 32, flex: "1 1 180px", minWidth: 160,
        }}>
          <i className="ti ti-search" style={{ fontSize: 13, color: "var(--t3)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search expenses…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ border: "none", background: "transparent", fontSize: 12, color: "var(--t1)", outline: "none", width: "100%", fontFamily: "inherit" }}
          />
          {search && (
            <button onClick={() => onSearchChange("")} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--t3)", padding: 0, lineHeight: 1 }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} />
            </button>
          )}
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          style={{
            height: 32, padding: "0 10px", border: "0.5px solid var(--b3)",
            borderRadius: "var(--rm)", background: "var(--bg2)", fontSize: 12,
            color: category ? "var(--blue)" : "var(--t2)", outline: "none",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Period */}
        <PeriodSelect
          value={period}
          onChange={onPeriodChange}
          includeAll
          allLabel="All periods"
          style={{ height: 32, fontSize: 12 }}
        />

        <span style={{ fontSize: 11, color: "var(--t3)", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {expenses.length} record{expenses.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Desktop Table */}
      <div className="ledger-desktop-only" style={{ display: "block", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: "32%" }}>Description</th>
              <th style={{ ...TH, width: "16%" }}>Category</th>
              <th style={{ ...TH, width: "13%" }}>Date</th>
              <th style={{ ...TH, width: "10%" }}>Period</th>
              <th style={{ ...TH, width: "14%" }}>Project</th>
              <th style={{ ...TH, textAlign: "right", width: "15%" }}>Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ ...COL, textAlign: "center", padding: "52px 16px", color: "var(--t3)" }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 24, display: "block", marginBottom: 10 }} />
                  <span style={{ fontSize: 12 }}>Loading expenses…</span>
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...COL, textAlign: "center", padding: "60px 16px", color: "var(--t3)" }}>
                  <i className="ti ti-receipt" style={{ fontSize: 34, display: "block", marginBottom: 12, opacity: 0.5 }} />
                  <div style={{ fontSize: 14, color: "var(--t2)", marginBottom: 4, fontWeight: 500 }}>No expenses found</div>
                  <div style={{ fontSize: 12 }}>{search || category ? "Try adjusting your filters" : "Add your first expense to get started"}</div>
                </td>
              </tr>
            ) : (
              expenses.map((exp) => {
                const meta = getCategoryMeta(exp.category);
                const isSelected = exp.id === selectedId;

                return (
                  <tr
                    key={exp.id}
                    onClick={() => onSelect(exp.id)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "var(--blue-bg)" : "transparent",
                      transition: "background .1s",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg2)"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    {/* Description */}
                    <td style={COL}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                          background: meta.bg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <i className={`ti ${meta.icon}`} style={{ fontSize: 14, color: meta.color }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {exp.description}
                          </div>
                          {exp.notes && (
                            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {exp.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td style={COL}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, padding: "3px 9px", borderRadius: 20,
                        background: meta.bg, color: meta.color, fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        <i className={`ti ${meta.icon}`} style={{ fontSize: 11 }} />
                        {exp.category}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ ...COL, color: "var(--t2)", fontSize: 12 }}>
                      {fmtDate(exp.date)}
                    </td>

                    {/* Period */}
                    <td style={COL}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--gray-bg)", color: "var(--gray)", fontWeight: 500 }}>
                        {exp.period}
                      </span>
                    </td>

                    {/* Project */}
                    <td style={{ ...COL, color: "var(--t2)", fontSize: 12 }}>
                      {exp.project?.name ?? <span style={{ color: "var(--t3)" }}>—</span>}
                    </td>

                    {/* Amount */}
                    <td style={{ ...COL, textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>
                        {fmt(exp.amountPkr)}
                      </span>
                      {exp.originalCurrency && exp.originalCurrency !== "PKR" && (
                        <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>
                          {exp.originalCurrency} {exp.originalAmount ? fmt(exp.originalAmount) : ""}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="ledger-mobile-only" style={{ display: "none" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--t3)" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 20, display: "block", marginBottom: 8 }} />
            <span style={{ fontSize: 12 }}>Loading expenses…</span>
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <i className="ti ti-receipt" style={{ fontSize: 28, display: "block", marginBottom: 8, opacity: 0.5, color: "var(--t3)" }} />
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 4, fontWeight: 500 }}>No expenses found</div>
            <div style={{ fontSize: 12, color: "var(--t3)" }}>{search || category ? "Try adjusting your filters" : "Add your first expense to get started"}</div>
          </div>
        ) : (
          expenses.map((exp) => (
            <ExpenseMobileCard key={exp.id} exp={exp} selected={exp.id === selectedId} onClick={() => onSelect(exp.id)} />
          ))
        )}
      </div>
    </div>
  );
}
