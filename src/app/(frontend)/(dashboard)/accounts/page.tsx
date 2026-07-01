"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { fmtPkr, pkrColor } from "@frontend/lib/currency";
import Topbar from "@frontend/components/layout/Topbar";
import AddAccountModal from "@frontend/components/accounts/AddAccountModal";
import EditAccountModal from "@frontend/components/accounts/EditAccountModal";
import { useAccounts } from "@frontend/hooks/useAccounts";
import { useDistributionPreview, useDistributions, runDistributionRequest } from "@frontend/hooks/useDistribution";
import type { CrmAccount, DistributionPreview, DistributionRecord } from "@frontend/types";

type Tab = "accounts" | "distribution";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return (Math.abs(n) / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtCompact(n: number) {
  const v = Math.abs(n) / 100;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return `${Math.round(v)}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function periodLabel(p: string) {
  if (!p) return p;
  return new Date(p + "-01").toLocaleString("default", { month: "long", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const TYPE_META = {
  operating:       { label: "Operating",       color: "var(--blue)",  bg: "var(--blue-bg)",  icon: "ti-building-bank" },
  company_reserve: { label: "Company Reserve", color: "#6D28D9",       bg: "#EDE9FE",         icon: "ti-safe" },
  stakeholder:     { label: "Stakeholder",     color: "var(--green)", bg: "var(--green-bg)", icon: "ti-user-circle" },
};

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, iconColor, iconBg }: {
  icon: string; label: string; value: string; sub?: string; iconColor: string; iconBg: string;
}) {
  return (
    <div style={{
      background: "var(--bg1)", border: "0.5px solid var(--b3)",
      borderRadius: "var(--rl)", padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
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

// ─── Accounts Table ───────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "10px 16px", fontSize: 10, fontWeight: 600, color: "var(--t3)",
  textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left",
  background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)", whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "13px 16px", fontSize: 13, color: "var(--t1)",
  verticalAlign: "middle", borderBottom: "0.5px solid var(--b3)",
};

function AccountsTable({ accounts, selectedId, loading, onSelect }: {
  accounts: CrmAccount[]; selectedId: string | null; loading: boolean; onSelect: (id: string) => void;
}) {
  const ordered = [
    ...accounts.filter((a) => a.type === "operating"),
    ...accounts.filter((a) => a.type === "company_reserve"),
    ...accounts.filter((a) => a.type === "stakeholder"),
  ];

  return (
    <div style={{
      background: "var(--bg1)", border: "0.5px solid var(--b3)",
      borderRadius: "var(--rl)", overflow: "hidden", boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: "0.5px solid var(--b3)",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>All Accounts</span>
        <span style={{ fontSize: 11, color: "var(--t3)" }}>
          {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: "28%" }}>Account</th>
              <th style={{ ...TH, width: "14%" }}>Type</th>
              <th style={{ ...TH, textAlign: "right", width: "10%" }}>Share</th>
              <th style={{ ...TH, textAlign: "right", width: "16%" }}>Current Balance</th>
              <th style={{ ...TH, textAlign: "right", width: "14%" }}>Lifetime Dist.</th>
              <th style={{ ...TH, textAlign: "right", width: "12%" }}>Commissions</th>
              <th style={{ ...TH, textAlign: "right", width: "16%" }}>All-Time Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ ...TD, textAlign: "center", padding: "52px 16px", color: "var(--t3)" }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 24, display: "block", marginBottom: 10 }} />
                  <span style={{ fontSize: 12 }}>Loading accounts…</span>
                </td>
              </tr>
            ) : ordered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...TD, textAlign: "center", padding: "60px 16px", color: "var(--t3)" }}>
                  <i className="ti ti-building-bank" style={{ fontSize: 34, display: "block", marginBottom: 12, opacity: 0.5 }} />
                  <div style={{ fontSize: 14, color: "var(--t2)", marginBottom: 4, fontWeight: 500 }}>No accounts yet</div>
                  <div style={{ fontSize: 12 }}>Add your first account to get started</div>
                </td>
              </tr>
            ) : (
              ordered.map((acc) => {
                const meta = TYPE_META[acc.type];
                const isSelected = acc.id === selectedId;
                const lifeTotal = acc.lifetimeDistPkr + acc.lifetimeCommPkr;
                return (
                  <tr
                    key={acc.id}
                    onClick={() => onSelect(acc.id)}
                    style={{ cursor: "pointer", background: isSelected ? "var(--blue-bg)" : "transparent", transition: "background .1s" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg2)"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    <td style={TD}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: meta.color, overflow: "hidden",
                        }}>
                          {acc.ownerUser?.avatarUrl
                            ? <img src={acc.ownerUser.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                            : initials(acc.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {acc.name}
                          </div>
                          {acc.ownerUser && (
                            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>{acc.ownerUser.name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={TD}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 11, padding: "3px 9px", borderRadius: 20,
                        background: meta.bg, color: meta.color, fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        <i className={`ti ${meta.icon}`} style={{ fontSize: 11 }} />
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: "right" }}>
                      {acc.type !== "operating"
                        ? <span style={{ fontSize: 13, fontWeight: 600, color: meta.color }}>{Number(acc.sharePct)}%</span>
                        : <span style={{ color: "var(--t3)" }}>—</span>}
                    </td>
                    <td style={{ ...TD, textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: pkrColor(acc.currentBalancePkr, meta.color) }}>
                        {fmtPkr(acc.currentBalancePkr)}
                      </span>
                    </td>
                    <td style={{ ...TD, textAlign: "right", color: "var(--t2)", fontSize: 12 }}>
                      {acc.lifetimeDistPkr > 0 ? `PKR ${fmt(acc.lifetimeDistPkr)}` : <span style={{ color: "var(--t3)" }}>—</span>}
                    </td>
                    <td style={{ ...TD, textAlign: "right", fontSize: 12 }}>
                      {acc.lifetimeCommPkr > 0
                        ? <span style={{ color: "var(--green)" }}>PKR {fmt(acc.lifetimeCommPkr)}</span>
                        : <span style={{ color: "var(--t3)" }}>—</span>}
                    </td>
                    <td style={{ ...TD, textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>PKR {fmt(lifeTotal)}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Account Detail Drawer Content ───────────────────────────────────────────

function AccountDetailContent({ account, preview, distributions, onEdit }: {
  account: CrmAccount;
  preview: DistributionPreview | null;
  distributions: DistributionRecord[];
  onEdit: (a: CrmAccount) => void;
}) {
  const meta = TYPE_META[account.type];
  const isOperating = account.type === "operating";
  const lifeTotal = account.lifetimeDistPkr + account.lifetimeCommPkr;

  const pendingItem = !isOperating && preview && preview.operatingBalancePkr > 0 && preview.warnings.length === 0
    ? preview.items.find((i) => i.accountId === account.id) ?? null
    : null;

  const history = distributions
    .map((d) => {
      const item = d.items.find((i) => i.account.id === account.id);
      return item ? { id: d.id, label: d.label, period: d.period, runAt: d.runAt, dist: item.distributionAmountPkr, comm: item.commissionAmountPkr, total: item.totalPkr } : null;
    }).filter(Boolean) as { id: string; label: string | null; period: string; runAt: string; dist: number; comm: number; total: number }[];

  const operatingHistory = distributions.map((d) => ({
    id: d.id, label: d.label, period: d.period, runAt: d.runAt,
    operatingBalancePkr: d.operatingBalancePkr,
    totalDistributedPkr: d.totalDistributedPkr,
    itemCount: d.items.length,
  }));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: meta.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: meta.color, flexShrink: 0, overflow: "hidden",
          }}>
            {account.ownerUser?.avatarUrl
              ? <img src={account.ownerUser.avatarUrl} alt="" style={{ width: 44, height: 44, objectFit: "cover" }} />
              : initials(account.name)}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)" }}>{account.name}</div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10,
              padding: "2px 7px", borderRadius: 20, background: meta.bg, color: meta.color, fontWeight: 600, marginTop: 3,
            }}>
              <i className={`ti ${meta.icon}`} style={{ fontSize: 10 }} /> {meta.label}
            </span>
          </div>
        </div>
        <button className="btn-outline" style={{ height: 30, fontSize: 12 }} onClick={() => onEdit(account)}>
          <i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit
        </button>
      </div>

      {/* Metric grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Current Balance", value: fmtPkr(account.currentBalancePkr), color: pkrColor(account.currentBalancePkr, "var(--t1)") },
          { label: "Share %", value: account.type !== "operating" ? `${Number(account.sharePct)}%` : "—", color: meta.color },
          { label: "Lifetime Distributions", value: `PKR ${fmt(account.lifetimeDistPkr)}`, color: "var(--blue)" },
          { label: "Lifetime Commissions", value: `PKR ${fmt(account.lifetimeCommPkr)}`, color: "var(--green)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--bg2)", borderRadius: "var(--rl)", padding: "14px 16px" }}>
            <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* All-time total */}
      <div style={{
        background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)",
        padding: "14px 16px", marginBottom: 14,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>All-Time Total Paid Out</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)" }}>PKR {fmt(lifeTotal)}</div>
        </div>
        <div style={{ display: "flex", gap: 20, textAlign: "right" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 3 }}>Distribution</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>PKR {fmt(account.lifetimeDistPkr)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 3 }}>Commission</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>PKR {fmt(account.lifetimeCommPkr)}</div>
          </div>
        </div>
      </div>

      {/* Pending distribution */}
      {pendingItem && (
        <div style={{ background: "#FFFBEB", border: "0.5px solid #F59E0B", borderRadius: "var(--rl)", padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600, marginBottom: 8 }}>
            <i className="ti ti-clock" style={{ fontSize: 12, marginRight: 4 }} />Pending — if distributed now
          </div>
          <div style={{ display: "flex", gap: 24 }}>
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
        <div style={{ padding: "11px 16px", borderBottom: "0.5px solid var(--b3)", fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>
          Distribution History
        </div>
        {isOperating ? (
          operatingHistory.length === 0 ? (
            <div style={{ padding: "28px 16px", fontSize: 12, color: "var(--t3)", textAlign: "center" }}>No distributions run yet</div>
          ) : operatingHistory.map((row, idx) => (
            <div key={row.id} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderBottom: idx < operatingHistory.length - 1 ? "0.5px solid var(--b3)" : "none", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.label || periodLabel(row.period)}
                </div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{fmtDate(row.runAt)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>PKR {fmt(row.totalDistributedPkr)}</div>
                <div style={{ fontSize: 10, color: "var(--t3)" }}>{row.itemCount} recipients</div>
              </div>
            </div>
          ))
        ) : history.length === 0 ? (
          <div style={{ padding: "28px 16px", fontSize: 12, color: "var(--t3)", textAlign: "center" }}>No distribution history yet</div>
        ) : history.map((row, idx) => (
          <div key={row.id} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderBottom: idx < history.length - 1 ? "0.5px solid var(--b3)" : "none", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.label || periodLabel(row.period)}
              </div>
              <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{fmtDate(row.runAt)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>PKR {fmt(row.total)}</div>
              {row.comm > 0 && <div style={{ fontSize: 10, color: "var(--green)", marginTop: 1 }}>+PKR {fmt(row.comm)} comm</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Distribution Tab ─────────────────────────────────────────────────────────

function DistributionTabContent({ onDistributed }: { onDistributed: () => void }) {
  const { data: preview, loading, error, refetch: refetchPreview } = useDistributionPreview();
  const { data: history, refetch: refetchHistory } = useDistributions();
  const [confirmRun, setConfirmRun] = useState(false);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState(false);
  const { data: session } = useSession();

  const canRun = ["super_admin", "admin"].includes(session?.user?.role ?? "");
  const canDistribute = preview && preview.operatingBalancePkr > 0 && preview.warnings.length === 0;

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    try {
      await runDistributionRequest(label || undefined, notes || undefined);
      setRunSuccess(true);
      setConfirmRun(false);
      setLabel("");
      setNotes("");
      await Promise.all([refetchPreview(), refetchHistory()]);
      onDistributed();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: "var(--t3)" }}>
        <i className="ti ti-loader-2" style={{ fontSize: 22 }} />
        <span style={{ fontSize: 13 }}>Loading distribution preview…</span>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "var(--red)", fontSize: 13 }}>
        {error ?? "Unable to load distribution preview"}
      </div>
    );
  }

  const reserveItems = preview.items.filter((i) => i.accountType === "company_reserve");
  const stakeholderItems = preview.items.filter((i) => i.accountType === "stakeholder");
  const unallocatedPct = +(100 - preview.totalStakeholderPct).toFixed(2);
  const finalReserveTotal = preview.companyReservePoolPkr + preview.stakeholderRemainderPkr;
  const operatingPkr = preview.operatingBalancePkr;
  const hasBalance = operatingPkr > 0;

  return (
    <div>

      {/* ── Hero bar ─────────────────────────────────────────────────────── */}
      <div className="dist-hero" style={{
        borderRadius: "var(--rl)",
        background: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #1e3a5f 100%)",
        padding: "24px 28px",
        marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 24px rgba(109,40,217,0.25)",
        position: "relative", overflow: "hidden",
        gap: 16,
      }}>
        <div style={{ position: "absolute", top: -40, right: 120, width: 160, height: 160, borderRadius: "50%", background: "rgba(109,40,217,0.2)", filter: "blur(40px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -30, right: 40, width: 120, height: 120, borderRadius: "50%", background: "rgba(14,165,233,0.15)", filter: "blur(30px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Distribution Engine · Operating Balance
          </div>
          <div className="dist-hero-amount" style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 8 }}>
            PKR {fmt(operatingPkr)}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
            {hasBalance
              ? preview.totalCommissionPkr > 0
                ? `Includes PKR ${fmt(preview.totalCommissionPkr)} in pending commissions`
                : "No pending commissions — full balance is distributable"
              : "No funds available to distribute"}
          </div>
        </div>

        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", flexShrink: 0 }}>
          {hasBalance && preview.warnings.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.2)", border: "0.5px solid rgba(16,185,129,0.4)", borderRadius: 20, padding: "6px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 500, whiteSpace: "nowrap" }}>Ready to distribute</span>
            </div>
          )}
          {preview.warnings.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.2)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 20, padding: "6px 12px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 12, color: "#FCD34D", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#FCD34D", fontWeight: 500 }}>{w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main two-column layout ────────────────────────────────────────── */}
      <div className="dist-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Waterfall visualization ─────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Tier 1 card */}
          <div style={{
            background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)",
            borderLeft: "3px solid #6D28D9", overflow: "hidden",
          }}>
            <div style={{ padding: "10px 18px", background: "rgba(109,40,217,0.04)", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#EDE9FE", color: "#6D28D9", letterSpacing: "0.05em" }}>TIER 1</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6D28D9" }}>Company Reserve</span>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>· {preview.companyReservePct}% of total operating balance</span>
            </div>
            {reserveItems.map((item) => (
              <div key={item.accountId} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="ti ti-safe" style={{ fontSize: 18, color: "#6D28D9" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)", marginBottom: 6 }}>{item.accountName}</div>
                  {/* Progress bar */}
                  <div style={{ height: 6, background: "var(--b3)", borderRadius: 3, overflow: "hidden", maxWidth: 320 }}>
                    <div style={{ width: `${item.sharePct}%`, height: "100%", background: "linear-gradient(90deg, #6D28D9, #8B5CF6)", borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>{item.sharePct}% of balance</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#6D28D9", letterSpacing: "-0.02em" }}>PKR {fmt(item.distributionAmountPkr)}</div>
                </div>
              </div>
            ))}
            {/* Remaining pool */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "var(--bg2)", borderTop: "0.5px dashed var(--b3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <i className="ti ti-arrow-down" style={{ fontSize: 12, color: "var(--t3)" }} />
                <span style={{ fontSize: 12, color: "var(--t2)" }}>Remaining pool passed to Tier 2</span>
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: "var(--bg3)", color: "var(--t3)", border: "0.5px solid var(--b3)" }}>
                  {(100 - preview.companyReservePct).toFixed(0)}%
                </span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--t2)" }}>PKR {fmt(preview.stakeholderPoolPkr)}</span>
            </div>
          </div>

          {/* Connector */}
          <div style={{ display: "flex", justifyContent: "center", height: 28, alignItems: "center" }}>
            <div style={{ width: 2, height: "100%", background: "var(--b3)", borderRadius: 1 }} />
          </div>

          {/* Tier 2 card */}
          <div style={{
            background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)",
            borderLeft: "3px solid #059669", overflow: "hidden",
          }}>
            <div style={{ padding: "10px 18px", background: "rgba(5,150,105,0.04)", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#D1FAE5", color: "#059669", letterSpacing: "0.05em" }}>TIER 2</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>Stakeholder Pool</span>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>· PKR {fmt(preview.stakeholderPoolPkr)} divided by stakeholder %</span>
            </div>

            {/* Stakeholder grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 1, background: "var(--b3)" }}>
              {stakeholderItems.map((item) => (
                <div key={item.accountId} style={{ background: "var(--bg1)", padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: "#D1FAE5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#059669", flexShrink: 0,
                    }}>
                      {initials(item.ownerName ?? item.accountName)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.ownerName ?? item.accountName}
                      </div>
                      {item.ownerName && item.ownerName !== item.accountName && (
                        <div style={{ fontSize: 11, color: "var(--t3)" }}>{item.accountName}</div>
                      )}
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "#059669", background: "#D1FAE5", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>
                      {item.sharePct}%
                    </span>
                  </div>
                  {/* Bar */}
                  <div style={{ height: 4, background: "var(--b3)", borderRadius: 2, marginBottom: 8, overflow: "hidden" }}>
                    <div style={{ width: `${item.sharePct}%`, height: "100%", background: "linear-gradient(90deg, #059669, #34D399)", borderRadius: 2 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#059669", letterSpacing: "-0.02em" }}>PKR {fmt(item.distributionAmountPkr)}</div>
                      {item.commissionAmountPkr > 0 && (
                        <div style={{ fontSize: 11, color: "var(--blue)", marginTop: 2 }}>
                          + PKR {fmt(item.commissionAmountPkr)} commission
                        </div>
                      )}
                    </div>
                    {item.commissionAmountPkr > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "var(--t3)" }}>Total payout</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>PKR {fmt(item.totalPkr)}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Allocated / Unallocated summary */}
            <div style={{ borderTop: "0.5px solid var(--b3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: unallocatedPct > 0 ? "0.5px dashed var(--b3)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#059669" }} />
                  <span style={{ fontSize: 12, color: "var(--t2)" }}>Allocated to stakeholders</span>
                  <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: "#D1FAE5", color: "#059669", fontWeight: 600 }}>
                    {preview.totalStakeholderPct.toFixed(0)}%
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>
                  PKR {fmt(stakeholderItems.reduce((s, i) => s + i.totalPkr, 0))}
                </span>
              </div>
              {unallocatedPct > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "rgba(245,158,11,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="ti ti-corner-down-right" style={{ fontSize: 12, color: "#D97706" }} />
                    <span style={{ fontSize: 12, color: "#D97706", fontWeight: 500 }}>Unallocated → Company Reserve</span>
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 20, background: "#FEF3C7", color: "#D97706", fontWeight: 600 }}>
                      {unallocatedPct}%
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#D97706" }}>+ PKR {fmt(preview.stakeholderRemainderPkr)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Connector */}
          <div style={{ display: "flex", justifyContent: "center", height: 28, alignItems: "center" }}>
            <div style={{ width: 2, height: "100%", background: "var(--b3)", borderRadius: 1 }} />
          </div>

          {/* Final Reserve Total */}
          <div style={{
            background: "linear-gradient(135deg, rgba(109,40,217,0.08) 0%, rgba(109,40,217,0.03) 100%)",
            border: "0.5px solid rgba(109,40,217,0.25)", borderRadius: "var(--rl)",
            borderLeft: "3px solid #6D28D9",
            padding: "18px 22px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="ti ti-building-bank" style={{ fontSize: 18, color: "#6D28D9" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#6D28D9" }}>Final Company Reserve Total</div>
                <div style={{ fontSize: 11, color: "#9D78E8", marginTop: 2 }}>
                  {preview.companyReservePct}% initial{unallocatedPct > 0 ? ` + ${unallocatedPct}% unallocated` : ""}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#6D28D9", letterSpacing: "-0.02em", lineHeight: 1 }}>
                PKR {fmt(finalReserveTotal)}
              </div>
              {operatingPkr > 0 && (
                <div style={{ fontSize: 11, color: "#9D78E8", marginTop: 4 }}>
                  {((finalReserveTotal / operatingPkr) * 100).toFixed(1)}% of total operating balance
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT: Run panel + History ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Run distribution panel */}
          {canRun && (
            <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-arrows-split" style={{ fontSize: 14, color: "#6D28D9" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>Run Distribution</span>
              </div>

              <div style={{ padding: "18px" }}>
                {runSuccess ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 0", textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <i className="ti ti-circle-check" style={{ fontSize: 24, color: "var(--green)" }} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--green)" }}>Distribution completed!</div>
                    <div style={{ fontSize: 12, color: "var(--t3)" }}>PKR {fmt(operatingPkr)} has been distributed.</div>
                    <button className="btn-outline" style={{ fontSize: 12, height: 32 }} onClick={() => setRunSuccess(false)}>
                      View updated balances
                    </button>
                  </div>
                ) : !confirmRun ? (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 4 }}>Amount to distribute</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: hasBalance ? "#6D28D9" : "var(--t3)", letterSpacing: "-0.02em" }}>
                        PKR {fmt(operatingPkr)}
                      </div>
                    </div>
                    {!hasBalance ? (
                      <div style={{ fontSize: 12, color: "var(--t3)", padding: "12px", background: "var(--bg2)", borderRadius: "var(--rm)", textAlign: "center" }}>
                        No balance available to distribute
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRun(true)}
                        style={{
                          width: "100%", height: 42, border: "none", borderRadius: "var(--rm)",
                          background: "linear-gradient(135deg, #6D28D9, #7C3AED)",
                          color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          boxShadow: "0 2px 12px rgba(109,40,217,0.3)",
                        }}
                      >
                        <i className="ti ti-arrows-split" style={{ fontSize: 15 }} />
                        Run Distribution
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid #D97706", borderRadius: "var(--rm)", padding: "10px 12px", marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#D97706", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} /> This cannot be undone
                      </div>
                      <div style={{ fontSize: 11, color: "#B45309" }}>
                        PKR {fmt(operatingPkr)} will be distributed and the operating account will be zeroed.
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                      <input
                        type="text"
                        placeholder="Label (e.g. May 2026 Payout)"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        style={{ height: 34, padding: "0 10px", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", background: "var(--bg2)", fontSize: 12, color: "var(--t1)", outline: "none", fontFamily: "inherit" }}
                      />
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ height: 34, padding: "0 10px", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", background: "var(--bg2)", fontSize: 12, color: "var(--t1)", outline: "none", fontFamily: "inherit" }}
                      />
                    </div>
                    {runError && (
                      <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{runError}</div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-outline" style={{ flex: 1, height: 36, fontSize: 12 }} onClick={() => { setConfirmRun(false); setRunError(null); }}>
                        Cancel
                      </button>
                      <button
                        onClick={handleRun}
                        disabled={running}
                        style={{
                          flex: 2, height: 36, border: "none", borderRadius: "var(--rm)",
                          background: running ? "var(--bg2)" : "linear-gradient(135deg, #6D28D9, #7C3AED)",
                          color: running ? "var(--t3)" : "#fff", fontSize: 13, fontWeight: 600,
                          cursor: running ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        }}
                      >
                        {running
                          ? <><i className="ti ti-loader-2" style={{ fontSize: 13 }} /> Running…</>
                          : <><i className="ti ti-arrows-split" style={{ fontSize: 13 }} /> Confirm & Run</>
                        }
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Summary mini-cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Reserve (Tier 1)", value: `PKR ${fmt(preview.companyReservePoolPkr)}`, color: "#6D28D9", bg: "#EDE9FE", icon: "ti-safe" },
              { label: "Stakeholder Pool", value: `PKR ${fmt(preview.stakeholderPoolPkr)}`, color: "#059669", bg: "#D1FAE5", icon: "ti-users" },
              { label: "Unallocated", value: `PKR ${fmt(preview.stakeholderRemainderPkr)}`, color: "#D97706", bg: "#FEF3C7", icon: "ti-corner-down-right" },
              { label: "Final Reserve", value: `PKR ${fmt(finalReserveTotal)}`, color: "#6D28D9", bg: "#EDE9FE", icon: "ti-building-bank" },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`ti ${icon}`} style={{ fontSize: 11, color }} />
                  </div>
                  <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Past distributions */}
          {history.length > 0 && (
            <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--b3)", fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>
                Past Distributions
              </div>
              {history.slice(0, 6).map((dist, idx) => (
                <div
                  key={dist.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: idx < Math.min(history.length, 6) - 1 ? "0.5px solid var(--b3)" : "none" }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="ti ti-arrows-split" style={{ fontSize: 12, color: "#6D28D9" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {dist.label || new Date(dist.runAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{fmtDate(dist.runAt)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>PKR {fmt(dist.totalDistributedPkr)}</div>
                    <span style={{ fontSize: 9, background: "var(--green-bg)", color: "var(--green)", padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>Done</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editAcc, setEditAcc] = useState<CrmAccount | null>(null);

  const { data: accounts, loading: accLoading, refetch: refetchAccounts } = useAccounts();
  const { data: preview, refetch: refetchPreview } = useDistributionPreview();
  const { data: distributions, refetch: refetchDist } = useDistributions();

  const selectedAccount = accounts.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !accounts.find((a) => a.id === selectedId)) setSelectedId(null);
  }, [accounts, selectedId]);

  // Close drawer when switching tabs
  useEffect(() => { setSelectedId(null); }, [tab]);

  function handleDistributed() { refetchPreview(); refetchDist(); refetchAccounts(); }
  function handleCreated() { refetchAccounts(); setShowAdd(false); }
  function handleUpdated(updated: CrmAccount) { refetchAccounts(); setSelectedId(updated.id); setEditAcc(null); }

  const operatingAcc = accounts.find((a) => a.isDefaultOperating) ?? accounts.find((a) => a.type === "operating") ?? null;
  const reserveAcc = accounts.find((a) => a.type === "company_reserve") ?? null;
  const stakeholderAccounts = accounts.filter((a) => a.type === "stakeholder");
  const stakeholderBalance = stakeholderAccounts.reduce((s, a) => s + a.currentBalancePkr, 0);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "accounts",     label: "Accounts",     icon: "ti-building-bank" },
    { id: "distribution", label: "Distribution", icon: "ti-arrows-split"  },
  ];

  return (
    <>
      <style>{`
        @keyframes drawerIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      <Topbar title="Accounts" />

      {/* ── Page shell ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg3)" }}>

        {/* ── Header + Tabs bar ──────────────────────────────────────────────── */}
        <div style={{ background: "var(--bg1)", borderBottom: "0.5px solid var(--b3)", flexShrink: 0 }}>
          <div className="accounts-header" style={{ padding: "18px 28px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            {/* Page title */}
            <div style={{ marginBottom: 0 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.02em", marginBottom: 2 }}>
                Accounts
              </h1>
              <p style={{ fontSize: 12, color: "var(--t3)", marginBottom: 14 }}>
                Manage operating, reserve and stakeholder accounts
              </p>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 0 }}>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 18px",
                      border: "none", background: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                      color: tab === t.id ? "var(--blue)" : "var(--t3)",
                      borderBottom: `2px solid ${tab === t.id ? "var(--blue)" : "transparent"}`,
                      marginBottom: -1,
                      transition: "color .15s, border-color .15s",
                    }}
                  >
                    <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ paddingBottom: 14, display: "flex", gap: 8, flexShrink: 0 }}>
              {tab === "accounts" && (
                <button className="btn-primary" style={{ height: 36, fontSize: 13, paddingInline: 16 }} onClick={() => setShowAdd(true)}>
                  <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab content ────────────────────────────────────────────────────── */}
        <div className="accounts-tab-content" style={{ flex: 1, overflowY: "auto", padding: "22px 28px" }}>

          {/* ── ACCOUNTS TAB ─────────────────────────────────────────────────── */}
          {tab === "accounts" && (
            <>
              {/* Metric cards */}
              <div className="metrics-4">
                <MetricCard
                  icon="ti-building-bank"
                  label="Operating Balance"
                  value={operatingAcc ? fmtPkr(operatingAcc.currentBalancePkr, true) : "PKR 0"}
                  sub="Available to distribute"
                  iconColor="var(--blue)"
                  iconBg="var(--blue-bg)"
                />
                <MetricCard
                  icon="ti-safe"
                  label="Company Reserve"
                  value={reserveAcc ? fmtPkr(reserveAcc.currentBalancePkr, true) : "PKR 0"}
                  sub={reserveAcc ? `${Number(reserveAcc.sharePct)}% allocation` : "Not configured"}
                  iconColor="#6D28D9"
                  iconBg="#EDE9FE"
                />
                <MetricCard
                  icon="ti-users"
                  label="Stakeholder Balances"
                  value={fmtPkr(stakeholderBalance, true)}
                  sub={`${stakeholderAccounts.length} stakeholder${stakeholderAccounts.length !== 1 ? "s" : ""}`}
                  iconColor="var(--green)"
                  iconBg="var(--green-bg)"
                />
                <MetricCard
                  icon="ti-chart-pie"
                  label="Total Accounts"
                  value={String(accounts.length)}
                  sub={`${accounts.filter(a => a.type === "operating").length} operating · ${stakeholderAccounts.length} stakeholder`}
                  iconColor="var(--teal)"
                  iconBg="var(--teal-bg)"
                />
              </div>

              {/* Accounts table */}
              <AccountsTable
                accounts={accounts}
                selectedId={selectedId}
                loading={accLoading}
                onSelect={setSelectedId}
              />
            </>
          )}

          {/* ── DISTRIBUTION TAB ─────────────────────────────────────────────── */}
          {tab === "distribution" && (
            <DistributionTabContent onDistributed={handleDistributed} />
          )}

        </div>
      </div>

      {/* ── Account detail drawer ──────────────────────────────────────────── */}
      {selectedId && tab === "accounts" && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 200, backdropFilter: "blur(2px)" }}
            onClick={() => setSelectedId(null)}
          />
          <div className="drawer-panel" style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
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
                Account Detail
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
            {selectedAccount
              ? <AccountDetailContent account={selectedAccount} preview={preview} distributions={distributions} onEdit={(a) => setEditAcc(a)} />
              : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t3)", fontSize: 12 }}>Loading…</div>
            }
          </div>
        </>
      )}

      <AddAccountModal open={showAdd} defaultType="stakeholder" onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      <EditAccountModal open={!!editAcc} account={editAcc} onClose={() => setEditAcc(null)} onUpdated={handleUpdated} />
    </>
  );
}
