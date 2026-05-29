"use client";

import Badge from "@frontend/components/ui/Badge";
import type { Commission } from "@frontend/types";

type FilterStatus = "all" | "pending" | "approved" | "paid";

interface CommissionListProps {
  commissions: Commission[];
  selectedId: string | null;
  filter: FilterStatus;
  search: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onFilterChange: (f: FilterStatus) => void;
  onSearchChange: (s: string) => void;
}

const FILTERS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Paid", value: "paid" },
];

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

export default function CommissionList({
  commissions,
  selectedId,
  filter,
  search,
  loading,
  onSelect,
  onFilterChange,
  onSearchChange,
}: CommissionListProps) {
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
          Commissions{" "}
          <span style={{ fontSize: 11, color: "var(--t2)", fontWeight: 400 }}>
            {commissions.length} records
          </span>
        </div>
        <div
          style={{
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
            placeholder="Search stakeholder or client…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ border: "none", background: "transparent", fontSize: 12, color: "var(--t1)", outline: "none", width: "100%" }}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 5, padding: "9px 16px", borderBottom: "0.5px solid var(--b3)" }}>
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
        ) : commissions.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "var(--t2)", gap: 8 }}>
            <i className="ti ti-coin" style={{ fontSize: 28, color: "var(--t3)" }} />
            <p style={{ fontSize: 13 }}>No commissions</p>
          </div>
        ) : (
          commissions.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                borderBottom: "0.5px solid var(--b3)",
                cursor: "pointer",
                background: c.id === selectedId ? "var(--blue-bg)" : "transparent",
                transition: "background .1s",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--blue-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--blue)",
                }}
              >
                {c.stakeholderAccount.ownerUser?.avatarUrl ? (
                  <img src={c.stakeholderAccount.ownerUser.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  getInitials(c.stakeholderAccount.name)
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.stakeholderAccount.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.client.companyName} · {c.period}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", marginBottom: 3 }}>
                  PKR {fmt(c.commissionPkr / 100)}
                </div>
                <Badge status={c.status} size="sm" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
