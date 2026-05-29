"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@frontend/components/layout/Topbar";
import AddAccountModal from "@frontend/components/accounts/AddAccountModal";
import EditAccountModal from "@frontend/components/accounts/EditAccountModal";
import { useAccounts } from "@frontend/hooks/useAccounts";
import { useDistributionPreview, useDistributions, runDistributionRequest } from "@frontend/hooks/useDistribution";
import type { CrmAccount, DistributionRecord, DistributionPreview } from "@frontend/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodLabel(p: string) {
  if (!p) return p;
  return new Date(p + "-01").toLocaleString("default", { month: "long", year: "numeric" });
}

function fmt(n: number) {
  return (Math.abs(n) / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtCompact(n: number) {
  const v = Math.abs(n) / 100;
  if (v >= 1_000_000) return `PKR ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `PKR ${Math.round(v / 1_000)}K`;
  return `PKR ${Math.round(v)}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PALETTE = [
  { bg: "#EFF6FF", fg: "#3B82F6" },
  { bg: "#F0FDF4", fg: "#16A34A" },
  { bg: "#FFFBEB", fg: "#92400E" },
  { bg: "#F5F3FF", fg: "#7C3AED" },
  { bg: "#FFF1F2", fg: "#BE123C" },
  { bg: "#ECFEFF", fg: "#0891B2" },
];

function useColorMap(accounts: CrmAccount[]) {
  return useMemo(() => {
    const map = new Map<string, { bg: string; fg: string }>();
    let si = 0;
    accounts.forEach((a) => {
      if (a.type === "operating") {
        map.set(a.id, { bg: "var(--blue-bg)", fg: "var(--blue)" });
      } else if (a.type === "company_reserve") {
        map.set(a.id, { bg: "var(--bg2)", fg: "var(--t2)" });
      } else {
        map.set(a.id, PALETTE[si++ % PALETTE.length]);
      }
    });
    return map;
  }, [accounts]);
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Operating Balance Card ───────────────────────────────────────────────────

function OperatingCard({
  account,
  preview,
  previewLoading,
}: {
  account: CrmAccount | null;
  preview: DistributionPreview | null;
  previewLoading: boolean;
}) {
  if (!account) {
    return (
      <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: 24, display: "flex", flexDirection: "column", gap: 8, alignItems: "center", justifyContent: "center", minHeight: 160 }}>
        <i className="ti ti-building-bank" style={{ fontSize: 28, color: "var(--t3)" }} />
        <div style={{ fontSize: 12, color: "var(--t3)" }}>No operating account</div>
      </div>
    );
  }

  const balance = account.currentBalancePkr;
  const isPositive = balance > 0;

  return (
    <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "22px 24px", borderLeft: `3px solid ${isPositive ? "var(--blue)" : "var(--t3)"}` }}>
      <div style={{ fontSize: 11, color: "var(--t3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
        Operating account balance
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: balance < 0 ? "var(--red)" : "var(--t1)", marginBottom: 2 }}>
        {balance < 0 ? "−" : ""}PKR {fmt(balance)}
      </div>
      <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 18 }}>
        {isPositive ? "Available to distribute anytime" : "No funds available for distribution"}
      </div>

      {previewLoading ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", color: "var(--t3)", fontSize: 11 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 13 }} /> Loading breakdown…
        </div>
      ) : preview && preview.totalCommissionPkr > 0 ? (
        <div style={{ display: "flex", gap: 20 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--t3)" }}>Pending commissions</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--amber, #D97706)" }}>
              {fmtCompact(preview.totalCommissionPkr)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--t3)" }}>Available after commissions</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: isPositive ? "var(--blue)" : "var(--t3)" }}>
              {fmtCompact(Math.max(0, balance - preview.totalCommissionPkr))}
            </div>
          </div>
        </div>
      ) : preview && isPositive ? (
        <div style={{ fontSize: 11, color: "var(--green)" }}>No pending commissions — full balance distributable</div>
      ) : null}
    </div>
  );
}

// ─── Distribution Card ────────────────────────────────────────────────────────

function DistributionCard({
  preview,
  previewLoading,
  previewError,
  colorMap,
  canRun,
  onDistributed,
}: {
  preview: DistributionPreview | null;
  previewLoading: boolean;
  previewError: string | null;
  colorMap: Map<string, { bg: string; fg: string }>;
  canRun: boolean;
  onDistributed: () => void;
}) {
  const [confirmRun, setConfirmRun] = useState(false);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const canDistribute = preview && preview.operatingBalancePkr > 0 && preview.warnings.length === 0;

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    try {
      await runDistributionRequest(label || undefined, notes || undefined);
      setSucceeded(true);
      setConfirmRun(false);
      setLabel("");
      setNotes("");
      onDistributed();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "18px 22px", display: "flex", flexDirection: "column" }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 500 }}>
          Distribution preview
        </div>
        {succeeded && (
          <span style={{ fontSize: 10, background: "var(--green-bg)", color: "var(--green)", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
            ✓ Distributed
          </span>
        )}
      </div>

      {/* Stakeholder rows */}
      <div style={{ flex: 1 }}>
        {previewLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--t3)", fontSize: 12, padding: "16px 0" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 15 }} /> Loading…
          </div>
        ) : previewError ? (
          <div style={{ fontSize: 12, color: "var(--red)", padding: "8px 0" }}>{previewError}</div>
        ) : preview && preview.items.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {preview.items.map((item, idx) => {
              const color = colorMap.get(item.accountId) ?? PALETTE[idx % PALETTE.length];
              const label = item.ownerName ?? item.accountName;
              return (
                <div key={item.accountId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: color.fg, flexShrink: 0 }}>
                    {initials(label)}
                  </div>
                  <div style={{ width: 80, fontSize: 12, fontWeight: 500, color: "var(--t1)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {label}
                  </div>
                  <div style={{ flex: 1, height: 4, background: "var(--b3)", borderRadius: 2 }}>
                    <div style={{ width: `${item.sharePct}%`, height: "100%", background: color.fg, borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", minWidth: 64, textAlign: "right", flexShrink: 0 }}>
                    {fmtCompact(item.totalPkr)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t3)", minWidth: 30, textAlign: "right", flexShrink: 0 }}>
                    {item.sharePct}%
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--t3)", padding: "12px 0" }}>
            No distribution accounts configured — add stakeholder accounts with a share %
          </div>
        )}

        {preview?.warnings.map((w, i) => (
          <div key={i} style={{ fontSize: 11, color: "#F59E0B", display: "flex", alignItems: "center", gap: 5, marginTop: 10 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} /> {w}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "0.5px solid var(--b3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, color: "var(--t3)" }}>
          Commissions included · balance zeros after run
        </div>
        {canRun && (
          <button
            className="btn-primary"
            onClick={() => { if (canDistribute) setConfirmRun(true); }}
            disabled={!canDistribute || running}
            style={{ height: 30, fontSize: 11, opacity: canDistribute ? 1 : 0.5 }}
          >
            <i className="ti ti-arrows-split" style={{ fontSize: 11 }} /> Run distribution
          </button>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmRun && (
        <div style={{ marginTop: 12, background: "var(--bg2)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "12px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#D97706", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-alert-triangle" /> This cannot be undone
          </div>
          <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 8 }}>
            PKR {fmt(preview!.operatingBalancePkr)} will be distributed and the operating account zeroed.
          </div>
          <input
            type="text"
            placeholder="Label (optional — e.g. May 2026 Payout)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{ width: "100%", height: 28, padding: "0 8px", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", background: "var(--bg1)", fontSize: 11, color: "var(--t1)", outline: "none", marginBottom: 6, boxSizing: "border-box" }}
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ width: "100%", height: 28, padding: "0 8px", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", background: "var(--bg1)", fontSize: 11, color: "var(--t1)", outline: "none", marginBottom: 8, boxSizing: "border-box" }}
          />
          {runError && <div style={{ fontSize: 11, color: "var(--red)", marginBottom: 8 }}>{runError}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn-outline" style={{ height: 28, fontSize: 11 }} onClick={() => { setConfirmRun(false); setRunError(null); }}>Cancel</button>
            <button
              className="btn-primary"
              style={{ height: 28, fontSize: 11, background: "#6D28D9" }}
              onClick={handleRun}
              disabled={running}
            >
              {running ? <><i className="ti ti-loader-2" style={{ fontSize: 11 }} /> Running…</> : "Confirm & run"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Account List Item ────────────────────────────────────────────────────────

function AccountItem({
  account,
  selected,
  color,
  onClick,
}: {
  account: CrmAccount;
  selected: boolean;
  color: { bg: string; fg: string };
  onClick: () => void;
}) {
  const subtitle =
    account.type === "operating"
      ? `Operating${account.isDefaultOperating ? " · default" : ""}`
      : account.type === "company_reserve"
      ? "Company reserve"
      : `${Number(account.sharePct)}% share`;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: selected ? "var(--blue-bg)" : "transparent",
        border: "none",
        borderLeft: `2px solid ${selected ? "var(--blue)" : "transparent"}`,
        padding: "11px 16px",
        cursor: "pointer",
        borderBottom: "0.5px solid var(--b3)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "background .1s",
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: selected ? "var(--blue)" : color.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: selected ? "#fff" : color.fg, flexShrink: 0 }}>
        {initials(account.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: selected ? "var(--blue)" : "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {account.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>{subtitle}</div>
      </div>
    </button>
  );
}

// ─── Account Detail Panel ─────────────────────────────────────────────────────

function AccountDetailPanel({
  account,
  preview,
  distributions,
  color,
  onEdit,
}: {
  account: CrmAccount;
  preview: DistributionPreview | null;
  distributions: DistributionRecord[];
  color: { bg: string; fg: string };
  onEdit: (a: CrmAccount) => void;
}) {
  const isOperating = account.type === "operating";

  // Find per-account pending distribution amount from preview
  const pendingItem = !isOperating && preview && preview.operatingBalancePkr > 0 && preview.warnings.length === 0
    ? preview.items.find((i) => i.accountId === account.id)
    : null;

  // For stakeholder/reserve accounts: per-item history
  const history = distributions
    .map((d) => {
      const item = d.items.find((i) => i.account.id === account.id);
      return item
        ? {
            id: d.id,
            label: d.label,
            period: d.period,
            runAt: d.runAt,
            dist: item.distributionAmountPkr,
            comm: item.commissionAmountPkr,
            total: item.totalPkr,
          }
        : null;
    })
    .filter(Boolean) as { id: string; label: string | null; period: string; runAt: string; dist: number; comm: number; total: number }[];

  // For operating account: show all distribution runs (operating is source, not recipient)
  const operatingHistory = distributions.map((d) => ({
    id: d.id,
    label: d.label,
    period: d.period,
    runAt: d.runAt,
    operatingBalancePkr: d.operatingBalancePkr,
    totalDistributedPkr: d.totalDistributedPkr,
    itemCount: d.items.length,
  }));

  const lifetimeTotal = account.lifetimeDistPkr + account.lifetimeCommPkr;

  const typeLabel =
    account.type === "operating" ? "Operating account"
    : account.type === "company_reserve" ? "Company reserve"
    : `Stakeholder · ${Number(account.sharePct)}% share`;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: color.fg, flexShrink: 0 }}>
            {initials(account.name)}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)" }}>{account.name}</div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{typeLabel}</div>
          </div>
        </div>
        <button className="btn-outline" style={{ height: 30, fontSize: 12 }} onClick={() => onEdit(account)}>
          <i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit
        </button>
      </div>

      {/* Top metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
        {[
          { label: "Current balance", value: `PKR ${fmt(account.currentBalancePkr)}`, color: "var(--t1)" },
          { label: "Lifetime distribution", value: `PKR ${fmt(account.lifetimeDistPkr)}`, color: "var(--t1)" },
          { label: "Lifetime commissions", value: `PKR ${fmt(account.lifetimeCommPkr)}`, color: "var(--green)" },
        ].map(({ label, value, color: c }) => (
          <div key={label} style={{ background: "var(--bg2)", borderRadius: "var(--rl)", padding: "16px 18px" }}>
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{value}</div>
          </div>
        ))}
      </div>

      {/* All-time total */}
      <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>All-time total paid out</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)" }}>PKR {fmt(lifetimeTotal)}</div>
        </div>
        <div style={{ display: "flex", gap: 32, textAlign: "right" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 3 }}>Distribution</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--blue)" }}>PKR {fmt(account.lifetimeDistPkr)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 3 }}>Commission</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>PKR {fmt(account.lifetimeCommPkr)}</div>
          </div>
        </div>
      </div>

      {/* Pending distribution banner */}
      {pendingItem && (
        <div style={{ background: "#FFFBEB", border: "0.5px solid #F59E0B", borderRadius: "var(--rl)", padding: "12px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600, marginBottom: 8 }}>
            Pending distribution — if run now
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            <div>
              <div style={{ fontSize: 10, color: "#92400E" }}>Distribution ({pendingItem.sharePct}%)</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#D97706" }}>PKR {fmt(pendingItem.distributionAmountPkr)}</div>
            </div>
            {pendingItem.commissionAmountPkr > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#92400E" }}>Commission</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#D97706" }}>PKR {fmt(pendingItem.commissionAmountPkr)}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, color: "#92400E" }}>Total payout</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#D97706" }}>PKR {fmt(pendingItem.totalPkr)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Distribution history */}
      <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "0.5px solid var(--b3)", fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>
          Distribution history
        </div>
        {isOperating ? (
          operatingHistory.length === 0 ? (
            <div style={{ padding: "24px 18px", fontSize: 12, color: "var(--t3)", textAlign: "center" }}>
              No distributions run yet
            </div>
          ) : (
            operatingHistory.map((row, idx) => (
              <div key={row.id} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: idx < operatingHistory.length - 1 ? "0.5px solid var(--b3)" : "none", gap: 12 }}>
                <div style={{ minWidth: 110, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)" }}>
                    {row.label || periodLabel(row.period)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{fmtDate(row.runAt)}</div>
                </div>
                <div style={{ flex: 1, fontSize: 12, color: "var(--t3)" }}>
                  Balance used: <span style={{ color: "var(--blue)" }}>PKR {fmt(row.operatingBalancePkr)}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>PKR {fmt(row.totalDistributedPkr)}</div>
                <span style={{ fontSize: 10, background: "var(--blue-bg)", color: "var(--blue)", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>
                  {row.itemCount} recipients
                </span>
              </div>
            ))
          )
        ) : history.length === 0 ? (
          <div style={{ padding: "24px 18px", fontSize: 12, color: "var(--t3)", textAlign: "center" }}>
            No distribution history yet
          </div>
        ) : (
          history.map((row, idx) => (
            <div key={row.id} style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: idx < history.length - 1 ? "0.5px solid var(--b3)" : "none", gap: 12 }}>
              <div style={{ minWidth: 110, flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)" }}>
                  {row.label || periodLabel(row.period)}
                </div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{fmtDate(row.runAt)}</div>
              </div>
              <div style={{ flex: 1, fontSize: 12, color: "var(--t3)" }}>
                Dist: <span style={{ color: "var(--blue)" }}>PKR {fmt(row.dist)}</span>
                {row.comm > 0 && <> + Comm: <span style={{ color: "var(--green)" }}>PKR {fmt(row.comm)}</span></>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>PKR {fmt(row.total)}</div>
              <span style={{ fontSize: 10, background: "var(--green-bg)", color: "var(--green)", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>Paid</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { data: session } = useSession();
  const { data: accounts, loading: accLoading, refetch: refetchAccounts } = useAccounts();
  const { data: preview, loading: previewLoading, error: previewError, refetch: refetchPreview } = useDistributionPreview();
  const { data: distributions, refetch: refetchDist } = useDistributions();
  const [selected, setSelected] = useState<CrmAccount | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"operating" | "company_reserve" | "stakeholder">("stakeholder");
  const [editAcc, setEditAcc] = useState<CrmAccount | null>(null);

  // Keep selected in sync with fresh account data after refetch
  useEffect(() => {
    if (!selected) return;
    const fresh = accounts.find((a) => a.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [accounts]);

  const colorMap = useColorMap(accounts);
  const canRun = ["super_admin", "admin"].includes(session?.user?.role ?? "");

  const operatingAcc = accounts.find((a) => a.isDefaultOperating) ?? accounts.find((a) => a.type === "operating") ?? null;

  function handleDistributed() {
    refetchPreview();
    refetchDist();
    refetchAccounts();
  }

  function handleCreated() {
    refetchAccounts();
    setShowAdd(false);
  }

  function handleUpdated(updated: CrmAccount) {
    refetchAccounts();
    setSelected(updated);
    setEditAcc(null);
  }

  const orderedAccounts = [
    ...accounts.filter((a) => a.type === "operating"),
    ...accounts.filter((a) => a.type === "company_reserve"),
    ...accounts.filter((a) => a.type === "stakeholder"),
  ];

  return (
    <>
      <Topbar title="Accounts" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Top: two-column summary ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 20px 0", flexShrink: 0 }}>
          <OperatingCard
            account={operatingAcc}
            preview={preview}
            previewLoading={previewLoading}
          />
          <DistributionCard
            preview={preview}
            previewLoading={previewLoading}
            previewError={previewError}
            colorMap={colorMap}
            canRun={canRun}
            onDistributed={handleDistributed}
          />
        </div>

        {/* ── Bottom: two-panel list + detail ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", margin: "16px 20px 20px" }}>

          {/* Left: account list */}
          <div style={{ width: 240, minWidth: 240, background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px 10px", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Accounts</div>
              <button
                className="btn-outline"
                style={{ height: 24, fontSize: 10, padding: "0 8px" }}
                onClick={() => { setAddType("stakeholder"); setShowAdd(true); }}
              >
                <i className="ti ti-plus" style={{ fontSize: 10 }} /> Add
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {accLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", padding: "24px 0", color: "var(--t3)", fontSize: 12 }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 15 }} /> Loading…
                </div>
              ) : (
                orderedAccounts.map((a) => (
                  <AccountItem
                    key={a.id}
                    account={a}
                    selected={selected?.id === a.id}
                    color={colorMap.get(a.id) ?? PALETTE[0]}
                    onClick={() => setSelected(a)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: detail panel */}
          <div style={{ flex: 1, background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", marginLeft: 14, overflow: "hidden", display: "flex" }}>
            {!selected ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--t3)" }}>
                <i className="ti ti-building-bank" style={{ fontSize: 40 }} />
                <div style={{ fontSize: 14, color: "var(--t2)" }}>Select an account to view details</div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <AccountDetailPanel
                  account={selected}
                  preview={preview}
                  distributions={distributions}
                  color={colorMap.get(selected.id) ?? PALETTE[0]}
                  onEdit={setEditAcc}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AddAccountModal
        open={showAdd}
        defaultType={addType}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />
      <EditAccountModal
        open={!!editAcc}
        account={editAcc}
        onClose={() => setEditAcc(null)}
        onUpdated={handleUpdated}
      />
    </>
  );
}
