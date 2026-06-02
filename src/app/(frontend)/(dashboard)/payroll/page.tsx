"use client";

import { useState } from "react";
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

export default function PayrollPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [period, setPeriod] = useState(currentPeriod());
  const [showAdd, setShowAdd] = useState(false);
  const [showRun, setShowRun] = useState(false);

  // Fetch all records for the period — filter client-side so metrics always reflect full period
  const { data, loading, refetch } = usePayroll({
    status: "all",
    period: period || undefined,
  });

  const allRecords = data?.items ?? [];

  // Client-side filter for table display
  const records = filter === "all" ? allRecords : allRecords.filter((r) => r.status === filter);

  // Always pick selected record from the full unfiltered list so drawer stays open when switching filters
  const selectedRecord: PayrollRecord | null = allRecords.find((r) => r.id === selectedId) ?? null;

  // Metrics derived from the full period data
  const totalGross = allRecords.reduce((s, r) => s + r.grossPkr, 0);
  const totalNet = allRecords.reduce((s, r) => s + r.netPkr, 0);
  const pendingRecords = allRecords.filter((r) => r.status === "pending");
  const paidRecords = allRecords.filter((r) => r.status === "paid");
  const pendingNet = pendingRecords.reduce((s, r) => s + r.netPkr, 0);

  function handleCreated(record: PayrollRecord) {
    refetch();
    setSelectedId(record.id);
  }

  function handlePaid() {
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

      <Topbar title="Payroll" />

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px", background: "var(--bg3)" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 3 }}>
              Payroll
            </h1>
            <p style={{ fontSize: 12, color: "var(--t3)" }}>
              Manage salary payments for employees and users
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-outline" style={{ height: 36, fontSize: 13, paddingInline: 16 }} onClick={() => setShowRun(true)}>
              <i className="ti ti-player-play" style={{ fontSize: 13 }} /> Run Payroll
            </button>
            <button className="btn-primary" style={{ height: 36, fontSize: 13, paddingInline: 16 }} onClick={() => setShowAdd(true)}>
              <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add Record
            </button>
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
          <MetricCard
            icon="ti-coin"
            label="Total Gross"
            value={fmtCompact(totalGross)}
            sub={`${allRecords.length} record${allRecords.length !== 1 ? "s" : ""}`}
            iconColor="var(--blue)"
            iconBg="var(--blue-bg)"
          />
          <MetricCard
            icon="ti-wallet"
            label="Net Payroll"
            value={fmtCompact(totalNet)}
            sub="Total take-home"
            iconColor="var(--green)"
            iconBg="var(--green-bg)"
          />
          <MetricCard
            icon="ti-clock"
            label="Pending"
            value={fmtCompact(pendingNet)}
            sub={`${pendingRecords.length} awaiting payment`}
            iconColor="var(--amber)"
            iconBg="var(--amber-bg)"
          />
          <MetricCard
            icon="ti-circle-check"
            label="Paid"
            value={String(paidRecords.length)}
            sub={`${fmtCompact(paidRecords.reduce((s, r) => s + r.netPkr, 0))} disbursed`}
            iconColor="var(--purple)"
            iconBg="var(--purple-bg)"
          />
        </div>

        {/* Table */}
        <PayrollList
          records={records}
          selectedId={selectedId}
          filter={filter}
          period={period}
          loading={loading}
          onSelect={setSelectedId}
          onFilterChange={setFilter}
          onPeriodChange={(p) => { setPeriod(p); setSelectedId(null); }}
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
                Payroll Detail
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
            <PayrollDetail record={selectedRecord} loading={false} onPaid={handlePaid} />
          </div>
        </>
      )}

      <AddPayrollModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      <RunPayrollModal open={showRun} onClose={() => setShowRun(false)} onCompleted={refetch} />
    </>
  );
}
