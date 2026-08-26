"use client";

import type { ProjectValueChange } from "@frontend/types";

interface ValueHistorySectionProps {
  valueChanges: ProjectValueChange[];
  currency: string;
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  initial_value: "Initial value",
  value_correction: "Value correction",
  upsell_added: "Upsell added",
  upsell_cancelled: "Upsell cancelled",
  manual_adjustment: "Manual adjustment",
};

function fmt(n: number, currency: string) {
  return `${currency} ${(n / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Row({ change, currency }: { change: ProjectValueChange; currency: string }) {
  const isIncrease = change.deltaPkr > 0;
  const isDecrease = change.deltaPkr < 0;

  return (
    <div className="trow" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)" }}>{CHANGE_TYPE_LABEL[change.changeType] ?? change.changeType}</span>
          {change.relatedUpsell && (
            <span style={{ fontSize: 11, color: "var(--blue)" }}>· {change.relatedUpsell.title}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--t2)" }}>{fmtDate(change.createdAt)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "var(--t2)" }}>
          {fmt(change.oldValueOriginal ?? change.oldValuePkr, currency)} → {fmt(change.newValueOriginal ?? change.newValuePkr, currency)}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: isIncrease ? "var(--green)" : isDecrease ? "var(--red)" : "var(--t2)" }}>
          {isIncrease ? "+" : ""}{fmt(change.deltaPkr, currency)}
        </div>
      </div>
      {(change.reason || change.notes) && (
        <div style={{ fontSize: 11, color: "var(--t3)" }}>{change.reason ?? change.notes}</div>
      )}
      {change.createdBy && (
        <div style={{ fontSize: 11, color: "var(--t3)" }}>by {change.createdBy.name}</div>
      )}
    </div>
  );
}

export default function ValueHistorySection({ valueChanges, currency }: ValueHistorySectionProps) {
  return (
    <div
      style={{
        background: "var(--bg1)",
        border: "0.5px solid var(--b3)",
        borderRadius: "var(--rl)",
        padding: 16,
        marginBottom: 14,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", marginBottom: 14 }}>Value history</div>

      {valueChanges.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {valueChanges.map((c) => <Row key={c.id} change={c} currency={currency} />)}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", padding: "12px 0" }}>
          No value history yet
        </p>
      )}
    </div>
  );
}
