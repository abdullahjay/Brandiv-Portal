"use client";

import { useState, useRef, useEffect } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import PLStatement from "@frontend/components/statements/PLStatement";
import CashFlowStatement from "@frontend/components/statements/CashFlowStatement";
import AccountStatement from "@frontend/components/statements/AccountStatement";
import DistributionStatement from "@frontend/components/statements/DistributionStatement";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

type Tab = "pl" | "account" | "distribution" | "cashflow";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "pl",           label: "P&L Statement",          icon: "ti-chart-bar" },
  { key: "account",      label: "Account Statements",     icon: "ti-building-bank" },
  { key: "distribution", label: "Distribution Statements", icon: "ti-arrows-split" },
  { key: "cashflow",     label: "Cash Flow",              icon: "ti-arrows-exchange" },
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("pl");
  const [plPeriod, setPlPeriod] = useState(currentPeriod());
  const [cfPeriod, setCfPeriod] = useState(currentPeriod());

  // Export handlers injected by child tabs
  const exportRef = useRef<{ exportCSV: () => void; exportPDF: () => void } | null>(null);

  // Reset export ref when tab changes
  useEffect(() => { exportRef.current = null; }, [tab]);

  function handleExportPDF() {
    if (exportRef.current) {
      exportRef.current.exportPDF();
    } else {
      window.print();
    }
  }

  function handleExportExcel() {
    if (exportRef.current) {
      exportRef.current.exportCSV();
    }
  }

  const showExport = tab === "account" || tab === "distribution";
  const showPeriod = tab === "pl" || tab === "cashflow";
  const activePeriod = tab === "pl" ? plPeriod : cfPeriod;
  const setActivePeriod = tab === "pl" ? setPlPeriod : setCfPeriod;

  return (
    <>
      <Topbar title="Statements" />
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>

        {/* Tab bar — underline style matching HTML reference */}
        <div style={{ display: "flex", alignItems: "flex-end", borderBottom: "0.5px solid var(--b3)", marginBottom: 20 }}>
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "10px 18px",
                fontSize: 13,
                cursor: "pointer",
                border: "none",
                borderBottom: `2px solid ${tab === key ? "var(--blue)" : "transparent"}`,
                color: tab === key ? "var(--blue)" : "var(--t2)",
                fontWeight: tab === key ? 500 : 400,
                background: "transparent",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "color .1s, border-color .1s",
                marginBottom: -1,
              }}
            >
              <i className={`ti ${icon}`} style={{ fontSize: 13 }} />
              {label}
            </button>
          ))}

          {/* Right side: period picker OR export buttons */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, paddingBottom: 10 }}>
            {showPeriod && (
              <>
                <span style={{ fontSize: 12, color: "var(--t2)" }}>Period</span>
                <PeriodSelect value={activePeriod} onChange={setActivePeriod} />
              </>
            )}
            {showExport && (
              <>
                <button
                  className="btn-outline"
                  style={{ height: 30, fontSize: 12 }}
                  onClick={handleExportPDF}
                >
                  <i className="ti ti-printer" style={{ fontSize: 12 }} /> Export PDF
                </button>
                <button
                  className="btn-outline"
                  style={{ height: 30, fontSize: 12 }}
                  onClick={handleExportExcel}
                >
                  <i className="ti ti-file-spreadsheet" style={{ fontSize: 12 }} /> Export Excel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Statement body */}
        {tab === "pl" && <PLStatement period={plPeriod} />}
        {tab === "account" && (
          <AccountStatement
            onExportReady={(handlers) => { exportRef.current = handlers; }}
          />
        )}
        {tab === "distribution" && (
          <DistributionStatement
            onExportReady={(handlers) => { exportRef.current = handlers; }}
          />
        )}
        {tab === "cashflow" && <CashFlowStatement period={cfPeriod} />}
      </div>
    </>
  );
}
