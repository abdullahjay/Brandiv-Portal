"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { fmtPkr } from "@frontend/lib/currency";
import { useDistributionPreview, useDistributions, runDistributionRequest } from "@frontend/hooks/useDistribution";
import type { DistributionPreview } from "@frontend/types";

function fmt(n: number) {
  return Math.abs(n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function periodLabel(p: string) {
  if (!p) return p;
  return new Date(p + "-01").toLocaleString("default", { month: "long", year: "numeric" });
}

// ─── Waterfall preview ──────────────────────────────────────────────────────

function WaterfallPreview({ preview }: { preview: DistributionPreview }) {
  const reserveItems = preview.items.filter((i) => i.accountType === "company_reserve");
  const stakeholderItems = preview.items.filter((i) => i.accountType === "stakeholder");
  const unallocatedPct = +(100 - preview.totalStakeholderPct).toFixed(2);
  const finalReserveTotal = preview.companyReservePoolPkr + preview.stakeholderRemainderPkr;

  return (
    <div style={{ fontFamily: "inherit" }}>

      {/* ── Operating Balance header ────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--blue-bg)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <i className="ti ti-wallet" style={{ fontSize: 16, color: "var(--blue)" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Operating Balance
            </div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>Available for distribution</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--blue)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {fmtPkr(preview.operatingBalancePkr)}
          </div>
          {preview.totalCommissionPkr > 0 && (
            <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 3 }}>
              incl. PKR {fmt(preview.totalCommissionPkr)} commissions
            </div>
          )}
        </div>
      </div>

      {/* ── Flow connector ──────────────────────────────────────────────────── */}
      <FlowArrow />

      {/* ── TIER 1: Company Reserve ─────────────────────────────────────────── */}
      <TierSection
        tier="1"
        label="Company Reserve"
        sublabel={`${preview.companyReservePct}% of operating balance`}
        color="#6D28D9"
        bg="#EDE9FE"
      >
        {reserveItems.map((item) => (
          <WaterfallRow
            key={item.accountId}
            icon="ti-safe"
            iconColor="#6D28D9"
            iconBg="#EDE9FE"
            name={item.accountName}
            sub={`${item.sharePct}% of total balance`}
            amount={item.distributionAmountPkr}
            amountColor="#6D28D9"
            bold
          />
        ))}

        {/* Remaining pool sub-row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px 10px 56px",
          borderTop: "0.5px dashed var(--b3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <i className="ti ti-arrow-down" style={{ fontSize: 11, color: "var(--t3)" }} />
            <span style={{ fontSize: 12, color: "var(--t2)" }}>Remaining pool</span>
            <span style={{
              fontSize: 10, padding: "1px 7px", borderRadius: 20,
              background: "var(--bg2)", color: "var(--t3)",
              border: "0.5px solid var(--b3)", fontWeight: 500,
            }}>
              {(100 - preview.companyReservePct).toFixed(0)}%
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>
            PKR {fmt(preview.stakeholderPoolPkr)}
          </div>
        </div>
      </TierSection>

      {/* ── Flow connector ──────────────────────────────────────────────────── */}
      <FlowArrow />

      {/* ── TIER 2: Stakeholder Pool ────────────────────────────────────────── */}
      <TierSection
        tier="2"
        label="Stakeholder Pool"
        sublabel={`PKR ${fmt(preview.stakeholderPoolPkr)} — divided by stakeholder %`}
        color="#059669"
        bg="#D1FAE5"
      >
        {stakeholderItems.map((item) => (
          <WaterfallRow
            key={item.accountId}
            icon="ti-user-circle"
            iconColor="#059669"
            iconBg="#D1FAE5"
            name={item.ownerName ?? item.accountName}
            sub={`${item.sharePct}% of pool${item.commissionAmountPkr > 0 ? ` · PKR ${fmt(item.commissionAmountPkr)} commission` : ""}`}
            amount={item.totalPkr}
            amountColor="#059669"
            bold
          />
        ))}

        {/* Allocated / Unallocated summary */}
        <div style={{ borderTop: "0.5px dashed var(--b3)" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 20px 9px 56px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#059669", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--t2)" }}>Allocated</span>
              <span style={{
                fontSize: 10, padding: "1px 7px", borderRadius: 20,
                background: "#D1FAE5", color: "#059669", fontWeight: 600,
              }}>
                {preview.totalStakeholderPct.toFixed(0)}%
              </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t2)" }}>
              PKR {fmt(stakeholderItems.reduce((s, i) => s + i.totalPkr, 0))}
            </div>
          </div>

          {unallocatedPct > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 20px 9px 56px",
              background: "rgba(245,158,11,0.06)",
              borderTop: "0.5px solid var(--b3)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <i className="ti ti-corner-down-right" style={{ fontSize: 11, color: "#D97706" }} />
                <span style={{ fontSize: 12, color: "#D97706", fontWeight: 500 }}>
                  Unallocated → Company Reserve
                </span>
                <span style={{
                  fontSize: 10, padding: "1px 7px", borderRadius: 20,
                  background: "#FEF3C7", color: "#D97706", fontWeight: 600,
                }}>
                  {unallocatedPct}%
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#D97706" }}>
                + PKR {fmt(preview.stakeholderRemainderPkr)}
              </div>
            </div>
          )}
        </div>
      </TierSection>

      {/* ── Flow connector ──────────────────────────────────────────────────── */}
      <FlowArrow />

      {/* ── Final Company Reserve Total ─────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: "linear-gradient(135deg, rgba(109,40,217,0.08) 0%, rgba(109,40,217,0.03) 100%)",
        borderTop: "0.5px solid rgba(109,40,217,0.2)",
        borderBottom: "0.5px solid rgba(109,40,217,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "#EDE9FE",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <i className="ti ti-building-bank" style={{ fontSize: 16, color: "#6D28D9" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6D28D9" }}>
              Final Company Reserve Total
            </div>
            <div style={{ fontSize: 10, color: "#9D78E8", marginTop: 2 }}>
              {preview.companyReservePct}% initial
              {unallocatedPct > 0 ? ` + ${unallocatedPct}% unallocated remainder` : ""}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#6D28D9", letterSpacing: "-0.02em", lineHeight: 1 }}>
            PKR {fmt(finalReserveTotal)}
          </div>
          <div style={{ fontSize: 10, color: "#9D78E8", marginTop: 3 }}>
            {((finalReserveTotal / preview.operatingBalancePkr) * 100).toFixed(1)}% of total balance
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FlowArrow() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 24, background: "var(--bg3)" }}>
      <div style={{ width: 1, height: "100%", background: "var(--b3)" }} />
      <i className="ti ti-chevron-down" style={{ position: "absolute", fontSize: 12, color: "var(--t3)" }} />
    </div>
  );
}

interface TierSectionProps {
  tier: string;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  children: React.ReactNode;
}

function TierSection({ tier, label, sublabel, color, bg, children }: TierSectionProps) {
  return (
    <div style={{ border: "none" }}>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 20px",
        background: "var(--bg2)",
        borderTop: "0.5px solid var(--b3)",
        borderBottom: "0.5px solid var(--b3)",
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
          background: bg, color, letterSpacing: "0.05em",
        }}>
          TIER {tier}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: "var(--t3)" }}>—</span>
        <span style={{ fontSize: 11, color: "var(--t3)" }}>{sublabel}</span>
      </div>
      {children}
    </div>
  );
}

interface WaterfallRowProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  name: string;
  sub: string;
  amount: number;
  amountColor: string;
  bold?: boolean;
}

function WaterfallRow({ icon, iconColor, iconBg, name, sub, amount, amountColor, bold }: WaterfallRowProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 20px",
      borderBottom: "0.5px solid var(--b3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 14, color: iconColor }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{name}</div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 1 }}>{sub}</div>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color: amountColor }}>
        PKR {fmt(amount)}
      </div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

interface DistributionPanelProps {
  onDistributed?: () => void;
}

export default function DistributionPanel({ onDistributed }: DistributionPanelProps) {
  const { data: session } = useSession();
  const [confirmRun, setConfirmRun] = useState(false);
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState(false);

  const { data: preview, loading: previewLoading, error: previewError, refetch: refetchPreview } = useDistributionPreview();
  const { data: history, refetch: refetchHistory } = useDistributions();

  const canRun = ["super_admin", "admin"].includes(session?.user?.role ?? "");

  const canDistribute =
    preview &&
    preview.operatingBalancePkr > 0 &&
    preview.warnings.length === 0;

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
      onDistributed?.();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>Distribution Engine</div>
          <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>Distribute available operating balance anytime</div>
        </div>
      </div>

      {/* Preview card */}
      <div style={{
        background: "var(--bg1)",
        border: "0.5px solid var(--b3)",
        borderRadius: "var(--rl)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}>

        {/* Card header */}
        <div style={{
          padding: "11px 16px",
          borderBottom: "0.5px solid var(--b3)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className="ti ti-arrows-split" style={{ fontSize: 14, color: "var(--t3)" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)" }}>
            Distribution Waterfall — Current Balance
          </span>
        </div>

        {previewLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 40, color: "var(--t3)", fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading preview…
          </div>
        ) : previewError ? (
          <div style={{ padding: 16, fontSize: 12, color: "var(--red)" }}>{previewError}</div>
        ) : preview ? (
          <>
            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div style={{ padding: "10px 16px", background: "var(--amber-bg)", borderBottom: "0.5px solid var(--b3)" }}>
                {preview.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#D97706", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 13, flexShrink: 0 }} />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* Waterfall */}
            <WaterfallPreview preview={preview} />

            {/* Footer note */}
            <div style={{ padding: "8px 16px", background: "var(--bg2)", borderTop: "0.5px solid var(--b3)", display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 11, color: "var(--t3)" }}>
                Commissions included · Operating balance zeros after run
              </span>
            </div>

            {/* Success state */}
            {runSuccess && (
              <div style={{ padding: "12px 16px", background: "var(--green-bg)", borderTop: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-circle-check" style={{ fontSize: 16, color: "var(--green)" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--green)" }}>
                  Distribution completed successfully.
                </span>
              </div>
            )}

            {/* Run error */}
            {runError && (
              <div style={{ padding: "10px 16px", background: "var(--red-bg)", borderTop: "0.5px solid var(--b3)", fontSize: 12, color: "var(--red)" }}>
                {runError}
              </div>
            )}

            {/* Action bar */}
            {canRun && (
              <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 10 }}>
                {confirmRun ? (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, flexWrap: "wrap" }}>
                    <div style={{
                      background: "var(--amber-bg)", border: "0.5px solid #D97706",
                      borderRadius: "var(--rm)", padding: "10px 12px", flex: 1, minWidth: 240,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#D97706", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} />
                        This cannot be undone
                      </div>
                      <div style={{ fontSize: 11, color: "#B45309", marginBottom: 8 }}>
                        PKR {fmt(preview.operatingBalancePkr)} will be distributed and the operating account zeroed.
                      </div>
                      <input
                        type="text"
                        placeholder="Label (optional — e.g. May 2026 Payout)"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        style={{
                          width: "100%", height: 30, padding: "0 8px",
                          border: "0.5px solid #D97706", borderRadius: "var(--rm)",
                          background: "transparent", fontSize: 12, color: "var(--t1)",
                          outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{
                          marginTop: 6, width: "100%", height: 30, padding: "0 8px",
                          border: "0.5px solid #D97706", borderRadius: "var(--rm)",
                          background: "transparent", fontSize: 12, color: "var(--t1)",
                          outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
                      <button className="btn-outline" onClick={() => { setConfirmRun(false); setRunError(null); }}>Cancel</button>
                      <button
                        className="btn-primary"
                        onClick={handleRun}
                        disabled={running}
                        style={{ background: "#6D28D9", display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <i className="ti ti-arrows-split" style={{ fontSize: 12 }} />
                        {running ? "Running…" : "Confirm & run"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => { if (canDistribute) setConfirmRun(true); }}
                    disabled={!canDistribute}
                    style={{
                      background: canDistribute ? "#6D28D9" : undefined,
                      opacity: canDistribute ? 1 : 0.5,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <i className="ti ti-arrows-split" style={{ fontSize: 12 }} />
                    Run distribution
                  </button>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Distribution history */}
      {history.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Past distributions
          </div>
          <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
            {history.map((dist, idx) => (
              <div
                key={dist.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
                  borderBottom: idx < history.length - 1 ? "0.5px solid var(--b3)" : "none",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 9, background: "#EDE9FE",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <i className="ti ti-arrows-split" style={{ fontSize: 13, color: "#6D28D9" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>
                    {dist.label || periodLabel(dist.period)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 1 }}>
                    {fmtDate(dist.runAt)} · by {dist.runBy?.name ?? "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>PKR {fmt(dist.totalDistributedPkr)}</div>
                  <div style={{ fontSize: 10, color: "var(--t2)", marginTop: 1 }}>
                    from PKR {fmt(dist.operatingBalancePkr)} balance
                  </div>
                </div>
                <span style={{
                  fontSize: 10, background: "var(--green-bg)", color: "var(--green)",
                  padding: "2px 8px", borderRadius: 20, fontWeight: 500,
                }}>
                  Completed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
