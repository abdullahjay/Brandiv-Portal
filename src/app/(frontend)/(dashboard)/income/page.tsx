"use client";

import { useState, useEffect } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import IncomeList from "@frontend/components/income/IncomeList";
import IncomeDetail from "@frontend/components/income/IncomeDetail";
import AddIncomeModal from "@frontend/components/income/AddIncomeModal";
import { useIncome } from "@frontend/hooks/useIncome";
import type { IncomeRecord, IncomeTotals } from "@frontend/types";

type FilterStatus = "all" | "pending" | "cleared";

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function fmtPkr(n: number) {
  return (n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function SummaryCard({
  label, value, sub, color, bg, icon,
}: {
  label: string; value: string; sub?: string; color: string; bg: string; icon: string;
}) {
  return (
    <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: "-0.01em" }}>PKR {value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function IncomePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [period, setPeriod] = useState(currentPeriod());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, refetch } = useIncome({
    status: filter,
    search: debouncedSearch,
    period: period || undefined,
  });

  const records = data?.items ?? [];
  const totals: IncomeTotals = data?.totals ?? { grossPkr: 0, whtAmountPkr: 0, gstAmountPkr: 0, bankChargesPkr: 0, netPkr: 0 };

  useEffect(() => {
    if (!loading && !selectedId && records.length > 0) {
      setSelectedId(records[0].id);
    }
  }, [loading, records, selectedId]);

  function handleCreated(record: IncomeRecord) {
    refetch();
    setSelectedId(record.id);
  }

  function handlePeriodChange(p: string) {
    setPeriod(p);
    setSelectedId(null);
  }

  return (
    <>
      <Topbar title="Income" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", gap: 10 }}>

        {/* Summary cards */}
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <SummaryCard
            label="Gross Income"
            value={fmtPkr(totals.grossPkr)}
            color="var(--green)"
            bg="var(--green-bg)"
            icon="ti-trending-up"
            sub={`${records.length} record${records.length !== 1 ? "s" : ""}`}
          />
          <SummaryCard
            label="WHT Deducted"
            value={fmtPkr(totals.whtAmountPkr)}
            color="#d97706"
            bg="#fef3c7"
            icon="ti-receipt-tax"
            sub={totals.grossPkr > 0 ? `${((totals.whtAmountPkr / totals.grossPkr) * 100).toFixed(1)}% of gross` : undefined}
          />
          <SummaryCard
            label="Net Received"
            value={fmtPkr(totals.netPkr)}
            color="var(--blue)"
            bg="var(--blue-bg)"
            icon="ti-wallet"
            sub={totals.bankChargesPkr > 0 ? `−PKR ${fmtPkr(totals.bankChargesPkr)} bank charges` : undefined}
          />
        </div>

        {/* Two-panel */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <IncomeList
            records={records}
            selectedId={selectedId}
            filter={filter}
            search={search}
            period={period}
            loading={loading}
            onSelect={setSelectedId}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            onPeriodChange={handlePeriodChange}
            onAddClick={() => setShowAdd(true)}
          />
          <IncomeDetail
            recordId={selectedId}
            onUpdated={refetch}
          />
        </div>
      </div>

      <AddIncomeModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
