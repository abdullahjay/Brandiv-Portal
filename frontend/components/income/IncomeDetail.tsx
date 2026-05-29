"use client";

import { useState } from "react";
import { useIncomeRecord, clearIncomeRequest } from "@frontend/hooks/useIncome";
import Badge from "@frontend/components/ui/Badge";

interface IncomeDetailProps {
  recordId: string | null;
  onUpdated?: () => void;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--t1)" }}>{value ?? "—"}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PkrRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--b3)" }}>
      <span style={{ fontSize: 12, color: "var(--t2)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: highlight ? 600 : 400, color: highlight ? "var(--green)" : "var(--t1)" }}>
        PKR {fmt(value / 100)}
      </span>
    </div>
  );
}

export default function IncomeDetail({ recordId, onUpdated }: IncomeDetailProps) {
  const { data: record, loading, refetch } = useIncomeRecord(recordId);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleClear() {
    if (!record) return;
    setActing(true);
    setActionError(null);
    try {
      await clearIncomeRequest(record.id);
      await refetch();
      onUpdated?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  if (!recordId) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--t2)" }}>
        <i className="ti ti-cash" style={{ fontSize: 40, color: "var(--t3)" }} />
        <p style={{ fontSize: 13 }}>Select a record to view details</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--t3)" }}>
        <i className="ti ti-loader-2" style={{ fontSize: 20 }} />
        <span style={{ fontSize: 12 }}>Loading…</span>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 20px",
          background: "var(--bg1)",
          borderBottom: "0.5px solid var(--b3)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-cash" style={{ fontSize: 14, color: "var(--green)" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>
              {record.client?.companyName ?? "Income"}
            </div>
            <div style={{ fontSize: 11, color: "var(--t2)" }}>{record.period}</div>
          </div>
          <Badge status={record.status} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actionError && <span style={{ fontSize: 11, color: "var(--red)" }}>{actionError}</span>}
          {record.status === "pending" && (
            <button
              className="btn-outline"
              style={{ color: "var(--green)", borderColor: "var(--green)" }}
              onClick={handleClear}
              disabled={acting}
            >
              <i className="ti ti-check" style={{ fontSize: 12 }} />
              {acting ? "…" : "Mark Cleared"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Original</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--t1)" }}>
              {record.originalCurrency} {fmt(record.originalAmount / 100)}
            </div>
            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>@ {Number(record.exchangeRate).toFixed(2)}</div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Gross PKR</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--t1)" }}>
              PKR {fmt(record.grossPkr / 100)}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Deductions</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--red)" }}>
              PKR {fmt((record.whtAmountPkr + record.gstAmountPkr + record.bankChargesPkr) / 100)}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Net PKR</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--green)" }}>
              PKR {fmt(record.netPkr / 100)}
            </div>
          </div>
        </div>

        {/* PKR breakdown */}
        <Section title="PKR breakdown">
          <PkrRow label="Gross PKR" value={record.grossPkr} />
          {record.whtAmountPkr > 0 && (
            <PkrRow label={`WHT (${Number(record.whtPct)}%)`} value={-record.whtAmountPkr} />
          )}
          {record.gstAmountPkr > 0 && (
            <PkrRow label={`GST (${Number(record.gstPct)}%)`} value={-record.gstAmountPkr} />
          )}
          {record.bankChargesPkr > 0 && (
            <PkrRow label="Bank charges" value={-record.bankChargesPkr} />
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>Net PKR</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>
              PKR {fmt(record.netPkr / 100)}
            </span>
          </div>
        </Section>

        {/* Payment details */}
        <Section title="Payment details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InfoItem label="Client" value={<span style={{ color: "var(--blue)" }}>{record.client?.companyName ?? "—"}</span>} />
            <InfoItem label="Invoice" value={record.invoice?.invoiceNumber ?? "—"} />
            <InfoItem label="Received" value={fmtDate(record.receivedAt)} />
            <InfoItem label="Period" value={record.period} />
            <InfoItem label="Currency" value={`${record.originalCurrency} → PKR`} />
            <InfoItem label="Exchange rate" value={`1 ${record.originalCurrency} = PKR ${Number(record.exchangeRate).toFixed(4)}`} />
            <InfoItem label="Payment method" value={record.paymentMethod ?? "—"} />
            <InfoItem label="Transaction ref" value={record.transactionRef ?? "—"} />
            <InfoItem label="Income type" value={record.incomeType ?? "—"} />
            <InfoItem label="Destination account" value={record.destinationAccount?.name ?? "—"} />
          </div>
        </Section>

        {/* Commissions triggered */}
        {record.commissions && record.commissions.length > 0 && (
          <Section title="Commissions triggered">
            {record.commissions.map((c) => (
              <div key={c.id} className="trow">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{c.stakeholderAccount.name}</div>
                  <div style={{ fontSize: 11, color: "var(--t2)" }}>Payment #{c.paymentNumber} · {Number(c.ratePct)}% rate</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", flexShrink: 0 }}>
                  PKR {fmt(c.commissionPkr / 100)}
                </div>
                <Badge status={c.status} size="sm" />
              </div>
            ))}
          </Section>
        )}

        {/* Notes */}
        {record.notes && (
          <Section title="Notes">
            <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>{record.notes}</p>
          </Section>
        )}
      </div>
    </div>
  );
}
