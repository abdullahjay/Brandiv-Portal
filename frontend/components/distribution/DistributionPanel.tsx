"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useDistributionPreview, useDistributions, runDistributionRequest } from "@frontend/hooks/useDistribution";

function fmt(n: number) {
  return Math.abs(n / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function periodLabel(p: string) {
  if (!p) return p;
  return new Date(p + "-01").toLocaleString("default", { month: "long", year: "numeric" });
}

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
      <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>

        {/* Card header */}
        <div style={{ padding: "12px 16px", borderBottom: "0.5px solid var(--b3)" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t2)" }}>
            Distribution preview — current balance
          </div>
        </div>

        {previewLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 32, color: "var(--t3)", fontSize: 12 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading preview…
          </div>
        ) : previewError ? (
          <div style={{ padding: 16, fontSize: 12, color: "var(--red)" }}>{previewError}</div>
        ) : preview ? (
          <>
            {/* Balance summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "0.5px solid var(--b3)" }}>
              {[
                { label: "Available Balance", value: preview.operatingBalancePkr, color: preview.operatingBalancePkr > 0 ? "var(--blue)" : "var(--t3)", bold: true },
                { label: "Pending Commissions", value: -preview.totalCommissionPkr, color: preview.totalCommissionPkr > 0 ? "var(--amber, #D97706)" : "var(--t3)" },
                { label: "Net Distributable", value: preview.operatingBalancePkr - preview.totalCommissionPkr, color: (preview.operatingBalancePkr - preview.totalCommissionPkr) > 0 ? "var(--green)" : "var(--red)", bold: true },
              ].map(({ label, value, color, bold }) => (
                <div key={label} style={{ padding: "12px 14px", borderRight: "0.5px solid var(--b3)" }}>
                  <div style={{ fontSize: 10, color: "var(--t2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color }}>
                    {value < 0 ? "−" : ""}PKR {fmt(value)}
                  </div>
                </div>
              ))}
            </div>

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

            {/* Per-account breakdown */}
            {preview.items.length > 0 && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr 1fr 1fr", gap: "0 12px", padding: "8px 16px", borderBottom: "0.5px solid var(--b3)", background: "var(--bg2)" }}>
                  {["Account", "Share", "Distribution", "Commission", "Total"].map((h) => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                  ))}
                </div>
                {preview.items.map((item) => (
                  <div
                    key={item.accountId}
                    style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr 1fr 1fr", gap: "0 12px", padding: "10px 16px", borderBottom: "0.5px solid var(--b3)", alignItems: "center" }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{item.ownerName ?? item.accountName}</div>
                      {item.ownerName && item.ownerName !== item.accountName && (
                        <div style={{ fontSize: 11, color: "var(--t2)" }}>{item.accountName}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--t2)" }}>{item.sharePct}%</div>
                    <div style={{ fontSize: 12, color: "var(--t1)" }}>PKR {fmt(item.distributionAmountPkr)}</div>
                    <div style={{ fontSize: 12, color: item.commissionAmountPkr > 0 ? "var(--blue)" : "var(--t3)" }}>
                      {item.commissionAmountPkr > 0 ? `PKR ${fmt(item.commissionAmountPkr)}` : "—"}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>PKR {fmt(item.totalPkr)}</div>
                  </div>
                ))}
                <div style={{ padding: "8px 16px", display: "flex", justifyContent: "flex-end", gap: 8, background: "var(--bg2)" }}>
                  <span style={{ fontSize: 11, color: "var(--t2)" }}>Commissions included · Operating balance zeros after run</span>
                </div>
              </div>
            )}

            {/* Success state */}
            {runSuccess && (
              <div style={{ padding: "12px 16px", background: "var(--green-bg)", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ti ti-circle-check" style={{ fontSize: 16, color: "var(--green)" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--green)" }}>
                  Distribution completed successfully.
                </span>
              </div>
            )}

            {/* Run error */}
            {runError && (
              <div style={{ padding: "10px 16px", background: "var(--red-bg)", fontSize: 12, color: "var(--red)" }}>
                {runError}
              </div>
            )}

            {/* Action bar */}
            {canRun && (
              <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 10 }}>
                {confirmRun ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
                    <div style={{ background: "var(--amber-bg)", border: "0.5px solid #D97706", borderRadius: "var(--rm)", padding: "8px 12px", flex: 1, minWidth: 240 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#D97706", marginBottom: 6 }}>
                        <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} /> This cannot be undone
                      </div>
                      <div style={{ fontSize: 11, color: "#D97706" }}>
                        PKR {fmt(preview.operatingBalancePkr)} will be distributed and the operating account zeroed.
                      </div>
                      <input
                        type="text"
                        placeholder="Label (optional — e.g. May 2026 Payout)"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        style={{ marginTop: 8, width: "100%", height: 30, padding: "0 8px", border: "0.5px solid #D97706", borderRadius: "var(--rm)", background: "transparent", fontSize: 12, color: "var(--t1)", outline: "none", boxSizing: "border-box" }}
                      />
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={{ marginTop: 6, width: "100%", height: 30, padding: "0 8px", border: "0.5px solid #D97706", borderRadius: "var(--rm)", background: "transparent", fontSize: 12, color: "var(--t1)", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
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
                    style={{ background: canDistribute ? "#6D28D9" : undefined, opacity: canDistribute ? 1 : 0.5, display: "flex", alignItems: "center", gap: 5 }}
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
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Past distributions</div>
          <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
            {history.map((dist, idx) => (
              <div
                key={dist.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: idx < history.length - 1 ? "0.5px solid var(--b3)" : "none" }}
              >
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                <span style={{ fontSize: 10, background: "var(--green-bg)", color: "var(--green)", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>
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
