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

const TABS: { key: Tab; label: string; short: string; icon: string }[] = [
  { key: "pl",           label: "P&L Statement",           short: "P&L",          icon: "ti-chart-bar"      },
  { key: "account",      label: "Account Statements",      short: "Account",      icon: "ti-building-bank"  },
  { key: "distribution", label: "Distribution Statements", short: "Distribution", icon: "ti-arrows-split"   },
  { key: "cashflow",     label: "Cash Flow",               short: "Cash Flow",    icon: "ti-arrows-exchange"},
];

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("pl");
  const [plPeriod, setPlPeriod] = useState(currentPeriod());
  const [cfPeriod, setCfPeriod] = useState(currentPeriod());

  const exportRef = useRef<{ exportCSV: () => void; exportPDF: () => void } | null>(null);
  useEffect(() => { exportRef.current = null; }, [tab]);

  function handleExportPDF() {
    if (exportRef.current) exportRef.current.exportPDF();
    else window.print();
  }
  function handleExportExcel() {
    if (exportRef.current) exportRef.current.exportCSV();
  }

  const showExport = tab === "account" || tab === "distribution";
  const showPeriod = tab === "pl" || tab === "cashflow";
  const activePeriod = tab === "pl" ? plPeriod : cfPeriod;
  const setActivePeriod = tab === "pl" ? setPlPeriod : setCfPeriod;

  return (
    <>
      <Topbar title="Statements" />
      <style>{`@media (max-width: 767px) { .reports-content { padding: 12px 12px 20px !important; } }`}</style>
      <div className="reports-content" style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>

        {/* ── Desktop tab bar (hidden on mobile via CSS) ── */}
        <div className="tab-scroll tab-bar-desktop" style={{ marginBottom: showPeriod || showExport ? 8 : undefined }}>
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
        </div>

        {/* ── Mobile 2×2 pill grid (hidden on desktop via CSS) ── */}
        <div className="tab-bar-mobile">
          {TABS.map(({ key, short, icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  padding: "11px 8px",
                  borderRadius: "var(--rl)",
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  border: `0.5px solid ${active ? "var(--blue)" : "var(--b3)"}`,
                  background: active ? "var(--blue-bg)" : "var(--bg1)",
                  color: active ? "var(--blue)" : "var(--t2)",
                  transition: "all .12s",
                  boxShadow: active ? "0 0 0 1px var(--blue)" : "none",
                }}
              >
                <i className={`ti ${icon}`} style={{ fontSize: 15 }} />
                {short}
              </button>
            );
          })}
        </div>

        {/* ── Period picker / export buttons ── */}
        {(showPeriod || showExport) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {showPeriod && (
              <>
                <span style={{ fontSize: 12, color: "var(--t2)" }}>Period</span>
                <PeriodSelect value={activePeriod} onChange={setActivePeriod} />
              </>
            )}
            {showExport && (
              <>
                <button className="btn-outline" style={{ height: 30, fontSize: 12 }} onClick={handleExportPDF}>
                  <i className="ti ti-printer" style={{ fontSize: 12 }} /> Export PDF
                </button>
                <button className="btn-outline" style={{ height: 30, fontSize: 12 }} onClick={handleExportExcel}>
                  <i className="ti ti-file-spreadsheet" style={{ fontSize: 12 }} /> Export Excel
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Statement body ── */}
        {tab === "pl"           && <PLStatement period={plPeriod} />}
        {tab === "account"      && <AccountStatement onExportReady={(h) => { exportRef.current = h; }} />}
        {tab === "distribution" && <DistributionStatement onExportReady={(h) => { exportRef.current = h; }} />}
        {tab === "cashflow"     && <CashFlowStatement period={cfPeriod} />}
      </div>
    </>
  );
}
