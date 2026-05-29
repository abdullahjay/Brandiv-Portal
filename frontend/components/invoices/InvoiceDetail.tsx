"use client";

import { useState } from "react";
import { useInvoice, sendInvoiceRequest, cancelInvoiceRequest } from "@frontend/hooks/useInvoices";
import Badge from "@frontend/components/ui/Badge";
import RecordPaymentModal from "@frontend/components/invoices/RecordPaymentModal";

interface InvoiceDetailProps {
  invoiceId: string | null;
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
    <div
      style={{
        background: "var(--bg1)",
        border: "0.5px solid var(--b3)",
        borderRadius: "var(--rl)",
        padding: 16,
        marginBottom: 14,
      }}
    >
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

export default function InvoiceDetail({ invoiceId, onUpdated }: InvoiceDetailProps) {
  const { data: invoice, loading, refetch } = useInvoice(invoiceId);
  const [acting, setActing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  async function handleAction(fn: () => Promise<unknown>) {
    setActing(true);
    setActionError(null);
    try {
      await fn();
      await refetch();
      onUpdated?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  if (!invoiceId) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--t2)" }}>
        <i className="ti ti-file-invoice" style={{ fontSize: 40, color: "var(--t3)" }} />
        <p style={{ fontSize: 13 }}>Select an invoice to view details</p>
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

  if (!invoice) return null;

  const canSend = invoice.status === "draft";
  const canRecordPayment = invoice.status === "sent" || invoice.status === "overdue";
  const canCancel = invoice.status !== "paid" && invoice.status !== "cancelled";

  const taxPct = invoice.subtotal > 0
    ? Math.round((invoice.taxAmount / invoice.subtotal) * 100)
    : 0;

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
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--blue-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-file-invoice" style={{ fontSize: 14, color: "var(--blue)" }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>{invoice.invoiceNumber}</div>
          <Badge status={invoice.status} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actionError && <span style={{ fontSize: 11, color: "var(--red)" }}>{actionError}</span>}
          {confirmCancel ? (
            <>
              <span style={{ fontSize: 12, color: "var(--t2)" }}>Cancel this invoice?</span>
              <button
                className="btn-outline"
                style={{ color: "var(--red)", borderColor: "var(--red)" }}
                onClick={() => handleAction(() => cancelInvoiceRequest(invoice.id)).then(() => setConfirmCancel(false))}
                disabled={acting}
              >
                {acting ? <i className="ti ti-loader-2" style={{ fontSize: 12 }} /> : "Confirm"}
              </button>
              <button className="btn-outline" onClick={() => setConfirmCancel(false)}>Back</button>
            </>
          ) : (
            <>
              {canSend && (
                <button
                  className="btn-outline"
                  style={{ color: "var(--blue)" }}
                  onClick={() => handleAction(() => sendInvoiceRequest(invoice.id))}
                  disabled={acting}
                >
                  <i className="ti ti-send" style={{ fontSize: 12 }} />
                  {acting ? "…" : "Mark Sent"}
                </button>
              )}
              {canRecordPayment && (
                <button
                  className="btn-primary"
                  onClick={() => setShowPayModal(true)}
                >
                  <i className="ti ti-cash" style={{ fontSize: 12 }} />
                  Record Payment
                </button>
              )}
              {canCancel && (
                <button
                  className="btn-outline"
                  style={{ color: "var(--red)" }}
                  onClick={() => setConfirmCancel(true)}
                >
                  <i className="ti ti-ban" style={{ fontSize: 12 }} /> Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Subtotal</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--t1)" }}>
              {invoice.currency} {fmt(invoice.subtotal / 100)}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Tax ({taxPct}%)</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--t1)" }}>
              {invoice.currency} {fmt(invoice.taxAmount / 100)}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Total</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--t1)" }}>
              {invoice.currency} {fmt(invoice.totalAmount / 100)}
            </div>
          </div>
        </div>

        {/* Invoice details */}
        <Section title="Invoice details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InfoItem label="Client" value={
              <span style={{ color: "var(--blue)" }}>{invoice.client?.companyName ?? "—"}</span>
            } />
            <InfoItem label="Project" value={invoice.project?.name ?? "—"} />
            <InfoItem label="Issue date" value={fmtDate(invoice.issueDate)} />
            <InfoItem label="Due date" value={fmtDate(invoice.dueDate)} />
            <InfoItem label="Payment terms" value={invoice.paymentTerms ?? "—"} />
            <InfoItem label="Payment #" value={invoice.paymentNumber} />
            {invoice.paidAt && <InfoItem label="Paid at" value={fmtDate(invoice.paidAt)} />}
          </div>
        </Section>

        {/* Line items */}
        <Section title="Line items">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 100px 100px",
              gap: "4px 12px",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--t2)", fontWeight: 500 }}>Description</div>
            <div style={{ fontSize: 11, color: "var(--t2)", fontWeight: 500, textAlign: "right" }}>Qty</div>
            <div style={{ fontSize: 11, color: "var(--t2)", fontWeight: 500, textAlign: "right" }}>Rate</div>
            <div style={{ fontSize: 11, color: "var(--t2)", fontWeight: 500, textAlign: "right" }}>Amount</div>
          </div>
          <div style={{ borderTop: "0.5px solid var(--b3)", paddingTop: 8 }}>
            {invoice.lineItems?.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 60px 100px 100px",
                  gap: "4px 12px",
                  padding: "6px 0",
                  borderBottom: "0.5px solid var(--b3)",
                }}
              >
                <div style={{ fontSize: 13, color: "var(--t1)" }}>{item.description}</div>
                <div style={{ fontSize: 12, color: "var(--t2)", textAlign: "right" }}>{item.quantity}</div>
                <div style={{ fontSize: 12, color: "var(--t2)", textAlign: "right" }}>
                  {invoice.currency} {fmt(item.rate / 100)}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", textAlign: "right" }}>
                  {invoice.currency} {fmt(item.amount / 100)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, gap: 32 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 3 }}>Subtotal</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{invoice.currency} {fmt(invoice.subtotal / 100)}</div>
            </div>
            {invoice.taxAmount > 0 && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 3 }}>Tax ({taxPct}%)</div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{invoice.currency} {fmt(invoice.taxAmount / 100)}</div>
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 3 }}>Total</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>{invoice.currency} {fmt(invoice.totalAmount / 100)}</div>
            </div>
          </div>
        </Section>

        {/* Notes */}
        {invoice.notes && (
          <Section title="Notes">
            <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>{invoice.notes}</p>
          </Section>
        )}
      </div>

      {/* Record Payment modal */}
      {showPayModal && (
        <RecordPaymentModal
          open={showPayModal}
          onClose={() => setShowPayModal(false)}
          onRecorded={async () => {
            await refetch();
            onUpdated?.();
          }}
          invoice={invoice}
        />
      )}
    </div>
  );
}
