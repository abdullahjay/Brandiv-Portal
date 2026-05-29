"use client";

import type { Expense } from "@frontend/types";

interface ExpenseListProps {
  expenses: Expense[];
  selectedId: string | null;
  search: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onSearchChange: (s: string) => void;
  onAddClick: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Office Rent": "#6366F1",
  "Software & Subscriptions": "#0EA5E9",
  "Salaries": "#10B981",
  "Freelancer / Contractor": "#F59E0B",
  "Marketing & Ads": "#EC4899",
  "Equipment & Hardware": "#8B5CF6",
  "Travel": "#14B8A6",
  "Utilities": "#F97316",
  "Legal & Professional": "#6B7280",
  "Banking & Fees": "#EF4444",
  "Other": "#9CA3AF",
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "#9CA3AF";
}

export default function ExpenseList({
  expenses,
  selectedId,
  search,
  loading,
  onSelect,
  onSearchChange,
  onAddClick,
}: ExpenseListProps) {
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
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", marginBottom: 10 }}>
          Expenses{" "}
          <span style={{ fontSize: 11, color: "var(--t2)", fontWeight: 400 }}>
            {expenses.length} records
          </span>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bg2)",
              border: "0.5px solid var(--b3)",
              borderRadius: "var(--rm)",
              padding: "0 10px",
              height: 32,
            }}
          >
            <i className="ti ti-search" style={{ fontSize: 14, color: "var(--t3)" }} />
            <input
              type="text"
              placeholder="Search expenses…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ border: "none", background: "transparent", fontSize: 12, color: "var(--t1)", outline: "none", width: "100%" }}
            />
          </div>
          <button className="btn-primary" style={{ height: 32 }} onClick={onAddClick}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} />
            Add
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--t3)", fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 20, marginRight: 8 }} />
            Loading…
          </div>
        ) : expenses.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "var(--t2)", gap: 8 }}>
            <i className="ti ti-receipt" style={{ fontSize: 28, color: "var(--t3)" }} />
            <p style={{ fontSize: 13 }}>No expenses</p>
          </div>
        ) : (
          expenses.map((exp) => {
            const color = getCategoryColor(exp.category);
            return (
              <div
                key={exp.id}
                onClick={() => onSelect(exp.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 16px",
                  borderBottom: "0.5px solid var(--b3)",
                  cursor: "pointer",
                  background: exp.id === selectedId ? "var(--blue-bg)" : "transparent",
                  transition: "background .1s",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--rm)",
                    background: `${color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <i className="ti ti-receipt" style={{ fontSize: 14, color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {exp.description}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1 }}>
                    {exp.category} · {fmtDate(exp.date)}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--red)" }}>
                    PKR {fmt(exp.amountPkr / 100)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>{exp.period}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
