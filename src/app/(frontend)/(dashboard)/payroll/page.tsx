"use client";

import { useState, useEffect } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import PayrollList from "@frontend/components/payroll/PayrollList";
import PayrollDetail from "@frontend/components/payroll/PayrollDetail";
import AddPayrollModal from "@frontend/components/payroll/AddPayrollModal";
import RunPayrollModal from "@frontend/components/payroll/RunPayrollModal";
import { usePayroll } from "@frontend/hooks/usePayroll";
import type { PayrollRecord } from "@frontend/types";

type FilterStatus = "all" | "pending" | "paid";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [period, setPeriod] = useState(currentPeriod());
  const [showAdd, setShowAdd] = useState(false);
  const [showRun, setShowRun] = useState(false);

  const { data, loading, refetch } = usePayroll({
    status: filter,
    period: period || undefined,
  });

  const records = data?.items ?? [];
  const selectedRecord: PayrollRecord | null = records.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!loading && !selectedId && records.length > 0) {
      setSelectedId(records[0].id);
    }
  }, [loading, records, selectedId]);

  function handleCreated(record: PayrollRecord) {
    refetch();
    setSelectedId(record.id);
  }

  function handleFilterChange(f: FilterStatus) {
    setFilter(f);
    setSelectedId(null);
  }

  function handlePeriodChange(p: string) {
    setPeriod(p);
    setSelectedId(null);
  }

  return (
    <>
      <Topbar title="Payroll" />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <PayrollList
          records={records}
          selectedId={selectedId}
          filter={filter}
          period={period}
          loading={loading}
          onSelect={setSelectedId}
          onFilterChange={handleFilterChange}
          onPeriodChange={handlePeriodChange}
          onAddClick={() => setShowAdd(true)}
          onRunClick={() => setShowRun(true)}
        />
        <PayrollDetail
          record={selectedRecord}
          loading={false}
          onPaid={refetch}
        />
      </div>

      <AddPayrollModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />

      <RunPayrollModal
        open={showRun}
        onClose={() => setShowRun(false)}
        onCompleted={refetch}
      />
    </>
  );
}
