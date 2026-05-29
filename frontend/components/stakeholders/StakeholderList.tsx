"use client";

import type { CrmAccount } from "@frontend/types";

function fmt(n: number) {
  return (n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

interface StakeholderListProps {
  stakeholders: CrmAccount[];
  selected: CrmAccount | null;
  onSelect: (s: CrmAccount) => void;
  onAdd: () => void;
  loading: boolean;
}

export default function StakeholderList({ stakeholders, selected, onSelect, onAdd, loading }: StakeholderListProps) {
  const totalShare = stakeholders.reduce((s, a) => s + Number(a.sharePct), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid var(--b3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>Stakeholders</div>
          <button className="btn-primary" style={{ height: 28, fontSize: 11 }} onClick={onAdd}>
            <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add
          </button>
        </div>
        {stakeholders.length > 0 && (
          <div style={{ fontSize: 11, color: totalShare === 100 ? "var(--green)" : "var(--t3)" }}>
            {stakeholders.length} stakeholder{stakeholders.length !== 1 ? "s" : ""} · {totalShare.toFixed(1)}% allocated
            {totalShare !== 100 && <span style={{ color: "#f59e0b" }}> (needs 100%)</span>}
          </div>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "32px 0", color: "var(--t3)", fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 16 }} /> Loading…
          </div>
        )}

        {!loading && stakeholders.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <i className="ti ti-user-share" style={{ fontSize: 32, color: "var(--t3)", display: "block", marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 4 }}>No stakeholders yet</div>
            <div style={{ fontSize: 11, color: "var(--t3)" }}>Add company owners or business partners who share in profits.</div>
          </div>
        )}

        {!loading && stakeholders.map((s) => {
          const isSelected = selected?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              style={{
                width: "100%",
                textAlign: "left",
                background: isSelected ? "var(--blue-bg)" : "transparent",
                border: "none",
                borderLeft: `2px solid ${isSelected ? "var(--blue)" : "transparent"}`,
                padding: "12px 16px",
                cursor: "pointer",
                borderBottom: "0.5px solid var(--b3)",
                transition: "background .1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Avatar */}
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: isSelected ? "var(--blue)" : "var(--green-bg, #f0fdf4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: isSelected ? "#fff" : "var(--green)",
                  flexShrink: 0,
                }}>
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? "var(--blue)" : "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>
                    {Number(s.sharePct)}% share · PKR {fmt(s.currentBalancePkr)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
