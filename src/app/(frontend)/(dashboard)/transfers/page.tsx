"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@frontend/components/layout/Topbar";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import { useAccounts } from "@frontend/hooks/useAccounts";
import { useTransfers, createTransferRequest, reverseTransferRequest } from "@frontend/hooks/useTransfers";
import type { TransferRecord, CrmAccount } from "@frontend/types";

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return (Math.abs(n) / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function accountTypeLabel(type: string) {
  if (type === "operating") return "Operating";
  if (type === "company_reserve") return "Reserve";
  return "Stakeholder";
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  completed: { color: "var(--green)", bg: "var(--green-bg)" },
  reversed:  { color: "var(--red)",   bg: "var(--red-bg)"   },
};

const ACCOUNT_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  operating:       { bg: "var(--blue-bg)", fg: "var(--blue)" },
  company_reserve: { bg: "var(--bg2)",     fg: "var(--t2)"   },
  stakeholder:     { bg: "var(--green-bg)", fg: "var(--green)" },
};

// ─── New Transfer Modal ───────────────────────────────────────────────────────

function NewTransferModal({
  accounts,
  onCreated,
  onClose,
}: {
  accounts: CrmAccount[];
  onCreated: (t: TransferRecord) => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccounts = accounts.filter((a) => a.id !== fromId);
  const effectiveToId = toId && toId !== fromId ? toId : (toAccounts[0]?.id ?? "");

  const amountPaise = Math.round(parseFloat(amountStr) * 100) || 0;
  const insufficientFunds = fromAccount && amountPaise > 0 && amountPaise > fromAccount.currentBalancePkr;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromId || !effectiveToId || !amountStr || !description) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createTransferRequest({
        fromAccountId: fromId,
        toAccountId:   effectiveToId,
        amountPkr:     amountPaise,
        description,
        notes:         notes || undefined,
        transferAt:    new Date(date + "T12:00:00").toISOString(),
      });
      onCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    width: "100%", height: 34, padding: "0 10px",
    border: "0.5px solid var(--b3)", borderRadius: "var(--rm)",
    background: "var(--bg1)", fontSize: 12, color: "var(--t1)",
    outline: "none", fontFamily: "inherit", cursor: "pointer",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 34, padding: "0 10px",
    border: "0.5px solid var(--b3)", borderRadius: "var(--rm)",
    background: "var(--bg1)", fontSize: 12, color: "var(--t1)",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const label12: React.CSSProperties = { fontSize: 11, color: "var(--t2)", marginBottom: 5, display: "block", fontWeight: 500 };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--bg1)", borderRadius: "var(--rl)", width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ padding: "18px 20px", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--t1)" }}>New Transfer</div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>Move funds between accounts</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", color: "var(--t3)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 1fr", alignItems: "end", gap: 8 }}>
            <div>
              <label style={label12}>From account</label>
              <select value={fromId} onChange={(e) => { setFromId(e.target.value); setToId(""); }} style={selectStyle}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — PKR {fmt(a.currentBalancePkr)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "center", paddingBottom: 4 }}>
              <i className="ti ti-arrow-right" style={{ fontSize: 16, color: "var(--blue)" }} />
            </div>
            <div>
              <label style={label12}>To account</label>
              <select value={effectiveToId} onChange={(e) => setToId(e.target.value)} style={selectStyle}>
                {toAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {fromAccount && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "var(--bg2)", borderRadius: "var(--rm)", fontSize: 11 }}>
              <i className="ti ti-wallet" style={{ fontSize: 13, color: "var(--t3)" }} />
              <span style={{ color: "var(--t2)" }}>Available in {fromAccount.name}:</span>
              <span style={{ fontWeight: 600, color: fromAccount.currentBalancePkr > 0 ? "var(--blue)" : "var(--red)" }}>
                PKR {fmt(fromAccount.currentBalancePkr)}
              </span>
            </div>
          )}

          <div>
            <label style={label12}>Amount (PKR)</label>
            <input type="number" step="0.01" min="0.01" placeholder="0.00" value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)} required
              style={{ ...inputStyle, borderColor: insufficientFunds ? "var(--red)" : "var(--b3)" }} />
            {insufficientFunds && (
              <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>Insufficient balance in source account</div>
            )}
          </div>

          <div>
            <label style={label12}>Description</label>
            <input type="text" placeholder="e.g. Lending from reserve to operations" value={description}
              onChange={(e) => setDescription(e.target.value)} required style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={label12}>Transfer date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={label12}>Notes (optional)</label>
            <textarea placeholder="Any additional context…" value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} style={{ ...inputStyle, height: "auto", padding: "8px 10px", resize: "vertical" }} />
          </div>

          {error && (
            <div style={{ padding: "10px 12px", background: "var(--red-bg, #FCEBEB)", borderRadius: "var(--rm)", fontSize: 12, color: "var(--red)" }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 12, marginRight: 6 }} />{error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" className="btn-outline" style={{ height: 34 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ height: 34, opacity: submitting || insufficientFunds ? 0.6 : 1 }}
              disabled={submitting || !!insufficientFunds}>
              {submitting
                ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Processing…</>
                : <><i className="ti ti-transfer" style={{ fontSize: 12 }} /> Confirm transfer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  transfer,
  canReverse,
  onReversed,
}: {
  transfer: TransferRecord | null;
  canReverse: boolean;
  onReversed: (reversal: TransferRecord) => void;
}) {
  const [reversing, setReversing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);

  useEffect(() => {
    setConfirm(false);
    setReverseError(null);
  }, [transfer?.id]);

  if (!transfer) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "var(--t3)" }}>
        <i className="ti ti-transfer" style={{ fontSize: 36 }} />
        <div style={{ fontSize: 13, color: "var(--t2)" }}>Select a transfer to view details</div>
      </div>
    );
  }

  const sc = STATUS_COLORS[transfer.status] ?? { color: "var(--t2)", bg: "var(--bg2)" };
  const fromColor = ACCOUNT_TYPE_COLORS[transfer.fromAccount.type] ?? ACCOUNT_TYPE_COLORS.stakeholder;
  const toColor   = ACCOUNT_TYPE_COLORS[transfer.toAccount.type]   ?? ACCOUNT_TYPE_COLORS.stakeholder;
  const isReversed = transfer.status === "reversed";
  const isReversal = !!transfer.reversalOfId;

  async function handleReverse() {
    setReversing(true);
    setReverseError(null);
    try {
      const reversal = await reverseTransferRequest(transfer!.id);
      onReversed(reversal);
    } catch (err) {
      setReverseError(err instanceof Error ? err.message : "Failed to reverse transfer");
      setReversing(false);
      setConfirm(false);
    }
  }

  return (
    <div style={{ padding: "20px 18px", overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: "0.5px solid var(--b3)" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#cffafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="ti ti-transfer" style={{ fontSize: 18, color: "#0891b2" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", lineHeight: 1.3 }}>{transfer.description}</div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 3 }}>{fmtDate(transfer.transferAt)}</div>
        </div>
        <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 600, whiteSpace: "nowrap", textTransform: "capitalize" }}>
          {transfer.status}
        </span>
      </div>

      {/* Amount */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Amount transferred</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: isReversed ? "var(--t3)" : "#0891b2", letterSpacing: "-0.02em", textDecoration: isReversed ? "line-through" : "none" }}>
          PKR {fmt(transfer.amountPkr)}
        </div>
      </div>

      {/* From → To diagram */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, background: "var(--bg2)", borderRadius: "var(--rl)", padding: "14px 16px" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: fromColor.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 5px", fontSize: 11, fontWeight: 700, color: fromColor.fg }}>
            {transfer.fromAccount.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t1)" }}>{transfer.fromAccount.name}</div>
          <div style={{ fontSize: 10, color: "var(--t3)" }}>{accountTypeLabel(transfer.fromAccount.type)}</div>
        </div>
        <i className="ti ti-arrow-right" style={{ fontSize: 18, color: isReversed ? "var(--t3)" : "#0891b2", flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: toColor.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 5px", fontSize: 11, fontWeight: 700, color: toColor.fg }}>
            {transfer.toAccount.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t1)" }}>{transfer.toAccount.name}</div>
          <div style={{ fontSize: 10, color: "var(--t3)" }}>{accountTypeLabel(transfer.toAccount.type)}</div>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        {[
          { label: "Period", value: (() => { const [y,m] = transfer.period.split("-"); return new Date(parseInt(y), parseInt(m)-1, 1).toLocaleString("default", { month: "long", year: "numeric" }); })() },
          { label: "Recorded by", value: transfer.createdBy?.name ?? "System" },
          ...(isReversal ? [{ label: "Type", value: "Reversal record" }] : []),
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 3, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--t1)", fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {transfer.notes && (
        <div style={{ padding: "10px 12px", background: "var(--bg2)", borderRadius: "var(--rm)", fontSize: 12, color: "var(--t2)", marginBottom: 14 }}>
          <i className="ti ti-note" style={{ fontSize: 12, marginRight: 5 }} />{transfer.notes}
        </div>
      )}

      {/* Transaction ID */}
      <div style={{ background: "var(--bg2)", borderRadius: "var(--rm)", padding: "10px 12px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Transaction ID</div>
        <div style={{ fontSize: 11, color: "#0891b2", fontFamily: "monospace", wordBreak: "break-all" }}>{transfer.id}</div>
      </div>

      {/* Reverse action — only for completed, non-reversal transfers */}
      {canReverse && !isReversed && !isReversal && (
        <div>
          {!confirm ? (
            <button onClick={() => setConfirm(true)} className="btn-outline"
              style={{ height: 32, fontSize: 12, color: "var(--red)", borderColor: "var(--red)" }}>
              <i className="ti ti-arrow-back-up" style={{ fontSize: 12 }} /> Reverse transfer
            </button>
          ) : (
            <div style={{ background: "var(--red-bg, #FCEBEB)", border: "0.5px solid var(--red)", borderRadius: "var(--rm)", padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--red)", marginBottom: 8 }}>
                This will restore both account balances. The original record will be marked as reversed.
              </div>
              {reverseError && <div style={{ fontSize: 11, color: "var(--red)", marginBottom: 8 }}>{reverseError}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-outline" style={{ height: 28, fontSize: 11 }} onClick={() => setConfirm(false)}>Cancel</button>
                <button className="btn-primary" style={{ height: 28, fontSize: 11, background: "var(--red)" }}
                  onClick={handleReverse} disabled={reversing}>
                  {reversing ? "Reversing…" : "Yes, reverse it"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isReversed && (
        <div style={{ padding: "10px 12px", background: "var(--red-bg, #FCEBEB)", borderRadius: "var(--rm)", fontSize: 12, color: "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 13 }} /> This transfer has been reversed. Balances have been restored.
        </div>
      )}

      {isReversal && (
        <div style={{ padding: "10px 12px", background: "#cffafe", borderRadius: "var(--rm)", fontSize: 12, color: "#0891b2", display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 13 }} /> This is a reversal record created automatically.
        </div>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function TransferRow({
  transfer,
  selected,
  onClick,
}: {
  transfer: TransferRecord;
  selected: boolean;
  onClick: () => void;
}) {
  const sc = STATUS_COLORS[transfer.status] ?? { color: "var(--t2)", bg: "var(--bg2)" };
  const isReversed = transfer.status === "reversed";

  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: "0.5px solid var(--b3)",
        cursor: "pointer",
        background: selected ? "var(--blue-bg)" : "transparent",
        transition: "background .08s",
        opacity: isReversed ? 0.6 : 1,
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = isReversed ? "transparent" : "transparent"; }}
    >
      <td style={{ padding: "9px 10px 9px 16px", color: "var(--t3)", fontSize: 11, whiteSpace: "nowrap" }}>
        {fmtDate(transfer.transferAt)}
      </td>
      <td style={{ padding: "9px 10px", maxWidth: 0, overflow: "hidden" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: selected ? "var(--blue)" : "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {transfer.description}
        </div>
      </td>
      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 11, color: "var(--t2)" }}>{transfer.fromAccount.name}</span>
        <i className="ti ti-arrow-right" style={{ fontSize: 10, color: "var(--t3)", margin: "0 4px" }} />
        <span style={{ fontSize: 11, color: "var(--t2)" }}>{transfer.toAccount.name}</span>
      </td>
      <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, color: isReversed ? "var(--t3)" : "#0891b2", whiteSpace: "nowrap",
        textDecoration: isReversed ? "line-through" : "none" }}>
        PKR {fmt(transfer.amountPkr)}
      </td>
      <td style={{ padding: "9px 16px 9px 10px", textAlign: "center" }}>
        <span style={{ fontSize: 10, background: selected ? "rgba(255,255,255,0.6)" : sc.bg, color: sc.color, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", textTransform: "capitalize" }}>
          {transfer.status}
        </span>
      </td>
    </tr>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color, icon, sub }: { label: string; value: string; color: string; icon: string; sub?: string }) {
  return (
    <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color }} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransfersPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState(currentPeriod());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TransferRecord | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: transfers, loading, error, refetch } = useTransfers(period);
  const { data: accounts } = useAccounts();

  const canReverse = ["super_admin", "admin"].includes(session?.user?.role ?? "");

  const filtered = useMemo(() => {
    if (!search.trim()) return transfers;
    const q = search.toLowerCase();
    return transfers.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.fromAccount.name.toLowerCase().includes(q) ||
        t.toAccount.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }, [transfers, search]);

  // Auto-select first record when list loads
  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelected(filtered[0]);
    }
  }, [transfers]);

  // Sync selected after refetch
  useEffect(() => {
    if (!selected) return;
    const fresh = transfers.find((t) => t.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
  }, [transfers]);

  const completedTransfers = filtered.filter((t) => t.status === "completed" && !t.reversalOfId);
  const totalAmount = completedTransfers.reduce((s, t) => s + t.amountPkr, 0);
  const reversedCount = filtered.filter((t) => t.status === "reversed").length;

  function handleCreated(t: TransferRecord) {
    setShowModal(false);
    refetch();
    setSelected(t);
  }

  function handleReversed(reversal: TransferRecord) {
    refetch();
    setSelected(reversal);
  }

  function handlePeriodChange(v: string) {
    setPeriod(v);
    setSelected(null);
  }

  return (
    <>
      <Topbar title="Transfers" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", gap: 12 }}>

        {/* ── Filter bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "0 10px", height: 32, flex: "1 1 180px", minWidth: 180, maxWidth: 280 }}>
            <i className="ti ti-search" style={{ fontSize: 14, color: "var(--t3)", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transfers…"
              style={{ border: "none", background: "transparent", fontSize: 12, color: "var(--t1)", outline: "none", width: "100%" }}
            />
          </div>

          <PeriodSelect
            value={period}
            onChange={handlePeriodChange}
            includeAll
            allLabel="All periods"
            style={{ height: 32 }}
          />

          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <button className="btn-primary" style={{ height: 32, fontSize: 12 }} onClick={() => setShowModal(true)}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> New transfer
            </button>
          </div>
        </div>

        {/* ── Summary metrics ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, flexShrink: 0 }}>
          <SummaryCard
            label="Total transferred"
            value={`PKR ${(totalAmount / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`}
            color="#0891b2"
            icon="ti-transfer"
            sub={`${completedTransfers.length} transfer${completedTransfers.length !== 1 ? "s" : ""}`}
          />
          <SummaryCard
            label="Records this period"
            value={`${filtered.length}`}
            color="var(--blue)"
            icon="ti-list-details"
            sub="including reversals"
          />
          <SummaryCard
            label="Reversed"
            value={`${reversedCount}`}
            color={reversedCount > 0 ? "var(--red)" : "var(--t3)"}
            icon="ti-arrow-back-up"
            sub="balance restored"
          />
        </div>

        {/* ── Two-column main ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* Left: table */}
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", flexShrink: 0 }}>
              <colgroup>
                <col width="13%" />
                <col width="30%" />
                <col width="32%" />
                <col width="15%" />
                <col width="10%" />
              </colgroup>
              <thead>
                <tr style={{ background: "var(--bg2)", borderBottom: "0.5px solid var(--b3)" }}>
                  {["Date", "Description", "From → To", "Amount", "Status"].map((h, i) => (
                    <th key={h} style={{
                      padding: "9px 10px", fontSize: 10, fontWeight: 600, color: "var(--t3)",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                      textAlign: i >= 3 ? "right" : "left",
                      ...(i === 0 ? { paddingLeft: 16 } : {}),
                      ...(i === 4 ? { paddingRight: 16, textAlign: "center" as const } : {}),
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 48, color: "var(--t3)", fontSize: 12 }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 18 }} /> Loading transfers…
                </div>
              ) : error ? (
                <div style={{ padding: 24, fontSize: 12, color: "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 14 }} /> {error}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--t2)" }}>
                  <i className="ti ti-transfer" style={{ fontSize: 32, color: "var(--t3)", display: "block", marginBottom: 10 }} />
                  <div style={{ fontSize: 13 }}>{search ? "No matching transfers" : "No transfers recorded yet"}</div>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
                    {!search && <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setShowModal(true)}>
                      <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create first transfer
                    </button>}
                  </div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col width="13%" />
                    <col width="30%" />
                    <col width="32%" />
                    <col width="15%" />
                    <col width="10%" />
                  </colgroup>
                  <tbody>
                    {filtered.map((t) => (
                      <TransferRow
                        key={t.id}
                        transfer={t}
                        selected={selected?.id === t.id}
                        onClick={() => setSelected(t)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && filtered.length > 0 && (
              <div style={{ padding: "8px 16px", borderTop: "0.5px solid var(--b3)", background: "var(--bg2)", fontSize: 11, color: "var(--t3)", flexShrink: 0 }}>
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}{search && ` matching "${search}"`}
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden" }}>
            <DetailPanel transfer={selected} canReverse={canReverse} onReversed={handleReversed} />
          </div>
        </div>
      </div>

      {showModal && (
        <NewTransferModal
          accounts={accounts}
          onCreated={handleCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
