"use client";

import { useState, useMemo } from "react";
import { useLedger } from "@frontend/hooks/useLedger";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import type { LedgerEntry } from "@frontend/types";

type TypeFilter = "all" | "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return Math.abs(n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  income:       { label: "Income",       color: "var(--green)",  bg: "var(--green-bg)",  icon: "ti-arrow-down-left"  },
  expense:      { label: "Expense",      color: "var(--red)",    bg: "var(--red-bg)",    icon: "ti-arrow-up-right"   },
  payroll:      { label: "Payroll",      color: "#d97706",       bg: "#fef3c7",          icon: "ti-wallet"           },
  distribution: { label: "Distribution", color: "#7c3aed",       bg: "#ede9fe",          icon: "ti-arrows-split"     },
  commission:   { label: "Commission",   color: "var(--blue)",   bg: "var(--blue-bg)",   icon: "ti-percentage"       },
  transfer:     { label: "Transfer",     color: "#0891b2",       bg: "#cffafe",          icon: "ti-transfer"         },
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending:   { color: "#92400e", bg: "#fef3c7" },
  cleared:   { color: "var(--green)", bg: "var(--green-bg)" },
  approved:  { color: "var(--blue)", bg: "var(--blue-bg)" },
  paid:      { color: "var(--green)", bg: "var(--green-bg)" },
  completed: { color: "var(--green)", bg: "var(--green-bg)" },
};

const TYPE_PILLS: { key: TypeFilter; label: string }[] = [
  { key: "all",          label: "All" },
  { key: "income",       label: "Income" },
  { key: "expense",      label: "Expenses" },
  { key: "payroll",      label: "Payroll" },
  { key: "distribution", label: "Distributions" },
  { key: "commission",   label: "Commissions" },
  { key: "transfer",     label: "Transfers" },
];

function exportCSV(entries: LedgerEntry[], period: string) {
  const headers = ["Date", "Type", "Description", "Party", "Reference", "PKR Amount", "Status", "Period"];
  const rows = entries.map((e) => [
    fmtDate(e.date),
    TYPE_CONFIG[e.type]?.label ?? e.type,
    e.description,
    e.party ?? "",
    e.reference ?? "",
    (e.pkrAmount / 100).toFixed(2),
    e.status,
    e.period,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger-${period || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ entry }: { entry: LedgerEntry | null }) {
  if (!entry) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "var(--t3)" }}>
        <i className="ti ti-list-details" style={{ fontSize: 36 }} />
        <div style={{ fontSize: 13, color: "var(--t2)" }}>Select a transaction to view details</div>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[entry.type] ?? { label: entry.type, color: "var(--t2)", bg: "var(--bg2)", icon: "ti-circle" };
  const isInflow = entry.pkrAmount >= 0;
  const sc = STATUS_COLORS[entry.status] ?? { color: "var(--t2)", bg: "var(--bg2)" };

  return (
    <div style={{ padding: "20px 18px", overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: "0.5px solid var(--b3)" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className={`ti ${cfg.icon}`} style={{ fontSize: 18, color: cfg.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", lineHeight: 1.3 }}>{entry.description}</div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 3 }}>{fmtDate(entry.date)}</div>
        </div>
      </div>

      {/* Big amount */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>PKR amount</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: isInflow ? "var(--green)" : "var(--red)", letterSpacing: "-0.02em" }}>
          <span style={{ fontSize: 16, marginRight: 2 }}>{isInflow ? "+" : "−"}</span>
          PKR {fmt(entry.pkrAmount)}
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {[
          { label: "Type", value: <span style={{ fontSize: 11, background: cfg.bg, color: cfg.color, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{cfg.label}</span> },
          { label: "Status", value: <span style={{ fontSize: 11, background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 20, fontWeight: 600, textTransform: "capitalize" as const }}>{entry.status}</span> },
          { label: "Period", value: <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--t1)" }}>{entry.period}</span> },
          { label: "Date", value: <span style={{ fontSize: 12, color: "var(--t1)" }}>{fmtDate(entry.date)}</span> },
          ...(entry.party ? [{ label: "Party", value: <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 500 }}>{entry.party}</span> }] : []),
          ...(entry.reference ? [{ label: "Reference", value: <span style={{ fontSize: 12, color: "var(--blue)", fontFamily: "monospace" }}>{entry.reference}</span> }] : []),
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div>{value}</div>
          </div>
        ))}
      </div>

      {/* Transaction ID */}
      <div style={{ background: "var(--bg2)", borderRadius: "var(--rm)", padding: "10px 12px" }}>
        <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Transaction ID</div>
        <div style={{ fontSize: 11, color: "var(--blue)", fontFamily: "monospace", wordBreak: "break-all" }}>{entry.id}</div>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function LedgerRow({
  entry,
  selected,
  onClick,
}: {
  entry: LedgerEntry;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = TYPE_CONFIG[entry.type] ?? { label: entry.type, color: "var(--t2)", bg: "var(--bg2)", icon: "ti-circle" };
  const isTransfer = entry.type === "transfer";
  const isInflow = entry.pkrAmount >= 0;
  const amountColor = isTransfer ? "#0891b2" : isInflow ? "var(--green)" : "var(--red)";

  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: "0.5px solid var(--b3)",
        cursor: "pointer",
        background: selected ? "var(--blue-bg)" : "transparent",
        transition: "background .08s",
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <td style={{ padding: "9px 10px 9px 16px", color: "var(--t3)", fontSize: 11, whiteSpace: "nowrap" }}>
        {fmtDate(entry.date)}
      </td>
      <td style={{ padding: "9px 10px" }}>
        <span style={{ fontSize: 10, background: cfg.bg, color: cfg.color, padding: "2px 7px", borderRadius: 20, fontWeight: 600, whiteSpace: "nowrap" }}>
          {cfg.label}
        </span>
      </td>
      <td style={{ padding: "9px 10px", maxWidth: 0, overflow: "hidden" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: selected ? "var(--blue)" : "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {entry.description}
        </div>
        {entry.party && (
          <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.party}
          </div>
        )}
      </td>
      <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, color: amountColor, whiteSpace: "nowrap" }}>
        {isTransfer ? "" : isInflow ? "+" : "−"}PKR {fmt(entry.pkrAmount)}
      </td>
      <td style={{ padding: "9px 16px 9px 10px", textAlign: "center" }}>
        <span style={{ fontSize: 10, background: selected ? "rgba(255,255,255,0.6)" : "var(--bg2)", color: "var(--t2)", padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" }}>
          {entry.status}
        </span>
      </td>
    </tr>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color }} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color }}>PKR {Math.abs(value / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LedgerList() {
  const [period, setPeriod] = useState(currentPeriod());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  const { data, loading, error } = useLedger({
    period: period || undefined,
    type: typeFilter === "all" ? undefined : typeFilter,
    page,
    pageSize: 100,
  });

  const allEntries = data?.items ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return allEntries;
    const q = search.toLowerCase();
    return allEntries.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (e.party ?? "").toLowerCase().includes(q) ||
        (e.reference ?? "").toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
    );
  }, [allEntries, search]);

  const pnlEntries   = filtered.filter((e) => e.type !== "transfer");
  const totalInflow  = pnlEntries.filter((e) => e.pkrAmount >= 0).reduce((s, e) => s + e.pkrAmount, 0);
  const totalOutflow = pnlEntries.filter((e) => e.pkrAmount < 0).reduce((s, e) => s + Math.abs(e.pkrAmount), 0);
  const net = totalInflow - totalOutflow;

  function handlePeriodChange(v: string) {
    setPeriod(v);
    setPage(1);
    setSelected(null);
  }

  function handleTypeChange(t: TypeFilter) {
    setTypeFilter(t);
    setPage(1);
    setSelected(null);
  }

  function handleSearch(v: string) {
    setSearch(v);
    setSelected(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>

      {/* ── Filter bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "0 10px", height: 32, flex: "1 1 180px", minWidth: 180, maxWidth: 280 }}>
          <i className="ti ti-search" style={{ fontSize: 14, color: "var(--t3)", flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search transactions…"
            style={{ border: "none", background: "transparent", fontSize: 12, color: "var(--t1)", outline: "none", width: "100%" }}
          />
        </div>

        {/* Period */}
        <PeriodSelect
          value={period}
          onChange={handlePeriodChange}
          includeAll
          allLabel="All periods"
          style={{ height: 32 }}
        />

        {/* Type filter pills */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TYPE_PILLS.map((p) => (
            <button
              key={p.key}
              onClick={() => handleTypeChange(p.key)}
              style={{
                height: 30,
                padding: "0 11px",
                borderRadius: 20,
                border: `0.5px solid ${typeFilter === p.key ? "#85B7EB" : "var(--b3)"}`,
                fontSize: 11,
                cursor: "pointer",
                fontWeight: typeFilter === p.key ? 600 : 400,
                background: typeFilter === p.key ? "var(--blue-bg)" : "transparent",
                color: typeFilter === p.key ? "var(--blue)" : "var(--t2)",
                transition: "all .1s",
                fontFamily: "inherit",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <button
            className="btn-outline"
            style={{ height: 32, fontSize: 12 }}
            onClick={() => exportCSV(filtered, period)}
            disabled={filtered.length === 0}
          >
            <i className="ti ti-download" style={{ fontSize: 12 }} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Summary metrics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, flexShrink: 0 }}>
        <SummaryCard label="Total inflows"  value={totalInflow}  color="var(--green)" icon="ti-trending-up" />
        <SummaryCard label="Total outflows" value={totalOutflow} color="var(--red)"   icon="ti-trending-down" />
        <SummaryCard
          label={`Net ${net >= 0 ? "surplus" : "deficit"}`}
          value={net}
          color={net >= 0 ? "var(--blue)" : "var(--red)"}
          icon={net >= 0 ? "ti-chart-bar" : "ti-alert-triangle"}
        />
      </div>

      {/* ── Two-column main ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Left: table */}
        <div style={{ display: "flex", flexDirection: "column", background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
          {/* Table header */}
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", flexShrink: 0 }}>
            <colgroup>
              <col width="14%" />
              <col width="13%" />
              <col width="46%" />
              <col width="17%" />
              <col width="10%" />
            </colgroup>
            <thead>
              <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                {["Date", "Type", "Description", "Amount", "Status"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 10px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--t3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      textAlign: i >= 3 ? "right" : "left",
                      ...(i === 0 ? { paddingLeft: 16 } : {}),
                      ...(i === 4 ? { paddingRight: 16, textAlign: "center" as const } : {}),
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          </table>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 12 }}>
                <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading transactions…
              </div>
            ) : error ? (
              <div style={{ padding: 24, fontSize: 12, color: "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 14 }} /> {error}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--t2)" }}>
                <i className="ti ti-list-details" style={{ fontSize: 32, color: "var(--t3)", display: "block", marginBottom: 10 }} />
                <div style={{ fontSize: 13 }}>{search ? "No matching transactions" : "No transactions found"}</div>
                <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>Try a different period or filter</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col width="14%" />
                  <col width="13%" />
                  <col width="46%" />
                  <col width="17%" />
                  <col width="10%" />
                </colgroup>
                <tbody>
                  {filtered.map((entry) => (
                    <LedgerRow
                      key={`${entry.type}-${entry.id}`}
                      entry={entry}
                      selected={selected?.id === entry.id && selected?.type === entry.type}
                      onClick={() => setSelected(entry)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: "8px 16px", borderTop: "0.5px solid var(--b3)", background: "var(--bg2)", fontSize: 11, color: "var(--t3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span>{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}{search && ` matching "${search}"`}</span>
              {data && data.total > 100 && (
                <span style={{ color: "var(--amber, #D97706)" }}>
                  Showing first 100 of {data.total} — narrow the period or type to see all
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
          <DetailPanel entry={selected} />
        </div>
      </div>
    </div>
  );
}
