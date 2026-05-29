"use client";

import Badge from "@frontend/components/ui/Badge";
import type { Invoice } from "@frontend/types";

type FilterStatus = "all" | "draft" | "sent" | "paid" | "overdue" | "cancelled";

interface InvoiceListProps {
  invoices: Invoice[];
  selectedId: string | null;
  filter: FilterStatus;
  search: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onFilterChange: (f: FilterStatus) => void;
  onSearchChange: (s: string) => void;
  onAddClick: () => void;
}

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function InvoiceList({
  invoices,
  selectedId,
  filter,
  search,
  loading,
  onSelect,
  onFilterChange,
  onSearchChange,
  onAddClick,
}: InvoiceListProps) {
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
          Invoices{" "}
          <span style={{ fontSize: 11, color: "var(--t2)", fontWeight: 400 }}>
            {invoices.length} total
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
              placeholder="Search..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 12,
                color: "var(--t1)",
                outline: "none",
                width: "100%",
              }}
            />
          </div>
          <button className="btn-primary" style={{ height: 32 }} onClick={onAddClick}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} />
            New
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div
        style={{
          display: "flex",
          gap: 5,
          padding: "9px 16px",
          borderBottom: "0.5px solid var(--b3)",
          flexWrap: "wrap",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            style={{
              fontSize: 11,
              padding: "3px 9px",
              borderRadius: 20,
              border: `0.5px solid ${filter === f.value ? "#85B7EB" : "var(--b3)"}`,
              cursor: "pointer",
              color: filter === f.value ? "var(--blue)" : "var(--t2)",
              background: filter === f.value ? "var(--blue-bg)" : "transparent",
              transition: "all .1s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--t3)", fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 20, marginRight: 8 }} />
            Loading…
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "var(--t2)", gap: 8 }}>
            <i className="ti ti-file-invoice" style={{ fontSize: 28, color: "var(--t3)" }} />
            <p style={{ fontSize: 13 }}>No invoices found</p>
          </div>
        ) : (
          invoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => onSelect(inv.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                borderBottom: "0.5px solid var(--b3)",
                cursor: "pointer",
                background: inv.id === selectedId ? "var(--blue-bg)" : "transparent",
                transition: "background .1s",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--rm)",
                  background: "var(--blue-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-file-invoice" style={{ fontSize: 14, color: "var(--blue)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {inv.invoiceNumber}
                </div>
                <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {inv.client?.companyName ?? "—"} · {fmtDate(inv.issueDate)}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", marginBottom: 3 }}>
                  {inv.currency} {fmt(inv.totalAmount / 100)}
                </div>
                <Badge status={inv.status} size="sm" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
