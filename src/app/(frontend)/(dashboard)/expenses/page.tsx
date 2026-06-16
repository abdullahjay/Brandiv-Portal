"use client";

import { useState, useEffect } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import ExpenseList from "@frontend/components/expenses/ExpenseList";
import ExpenseDetail from "@frontend/components/expenses/ExpenseDetail";
import AddExpenseModal from "@frontend/components/expenses/AddExpenseModal";
import { useExpenses } from "@frontend/hooks/useExpenses";
import type { Expense } from "@frontend/types";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmtCompact(pkrPaise: number) {
  const pkr = pkrPaise / 100;
  if (pkr >= 1_000_000) return `PKR ${(pkr / 1_000_000).toFixed(1)}M`;
  if (pkr >= 1_000) return `PKR ${(pkr / 1_000).toFixed(0)}K`;
  return `PKR ${pkr.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  iconColor: string;
  iconBg: string;
}

function MetricCard({ icon, label, value, sub, iconColor, iconBg }: MetricCardProps) {
  return (
    <div style={{
      background: "var(--bg1)",
      border: "0.5px solid var(--b3)",
      borderRadius: "var(--rl)",
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 22, color: iconColor }} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.02em", lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [period, setPeriod] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, refetch } = useExpenses({
    search: debouncedSearch || undefined,
    category: category || undefined,
    period: period || undefined,
  });

  // For metrics, always fetch the current month's totals independently
  const { data: monthData } = useExpenses({ period: currentPeriod() });
  const thisMonthTotal = (monthData?.items ?? []).reduce((s, e) => s + e.amountPkr, 0);

  const expenses = data?.items ?? [];
  const selectedExpense: Expense | null = expenses.find((e) => e.id === selectedId) ?? null;

  // Metrics
  const grandTotal = expenses.reduce((s, e) => s + e.amountPkr, 0);

  // Top category by total spend
  const catTotals: Record<string, number> = {};
  for (const e of expenses) {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amountPkr;
  }
  const topCategory = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  function handleCreated(expense: Expense) {
    refetch();
    setSelectedId(expense.id);
  }

  function handleDeleted() {
    setSelectedId(null);
    refetch();
  }

  return (
    <>
      <style>{`
        @keyframes drawerIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <Topbar title="Expenses" />

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px", background: "var(--bg3)" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 3 }}>
              Expenses
            </h1>
            <p style={{ fontSize: 12, color: "var(--t3)" }}>
              Track all operational and business expenses
            </p>
          </div>
          <button className="btn-primary" style={{ height: 36, fontSize: 13, paddingInline: 16 }} onClick={() => setShowAdd(true)}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add Expense
          </button>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
          <MetricCard
            icon="ti-receipt"
            label="Total Expenses"
            value={fmtCompact(grandTotal)}
            sub={`${expenses.length} record${expenses.length !== 1 ? "s" : ""}`}
            iconColor="var(--red)"
            iconBg="var(--red-bg)"
          />
          <MetricCard
            icon="ti-calendar-month"
            label="This Month"
            value={fmtCompact(thisMonthTotal)}
            sub={currentPeriod()}
            iconColor="var(--blue)"
            iconBg="var(--blue-bg)"
          />
          <MetricCard
            icon="ti-chart-bar"
            label="Top Category"
            value={topCategory}
            sub={topCategory !== "—" ? fmtCompact(catTotals[topCategory] ?? 0) : undefined}
            iconColor="var(--purple)"
            iconBg="var(--purple-bg)"
          />
          <MetricCard
            icon="ti-trending-up"
            label="Avg per Record"
            value={expenses.length > 0 ? fmtCompact(Math.round(grandTotal / expenses.length)) : "PKR 0"}
            sub="based on current filter"
            iconColor="var(--teal)"
            iconBg="var(--teal-bg)"
          />
        </div>

        {/* Table */}
        <ExpenseList
          expenses={expenses}
          selectedId={selectedId}
          search={search}
          category={category}
          period={period}
          loading={loading}
          onSelect={setSelectedId}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onPeriodChange={setPeriod}
        />
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 200, backdropFilter: "blur(2px)" }}
            onClick={() => setSelectedId(null)}
          />
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 460,
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
                Expense Detail
              </span>
              <button
                onClick={() => setSelectedId(null)}
                style={{
                  width: 28, height: 28, border: "none", background: "var(--bg2)",
                  borderRadius: 6, cursor: "pointer", color: "var(--t2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <i className="ti ti-x" style={{ fontSize: 14 }} />
              </button>
            </div>
            <ExpenseDetail expense={selectedExpense} loading={false} onDeleted={handleDeleted} />
          </div>
        </>
      )}

      <AddExpenseModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={handleCreated} />
    </>
  );
}
