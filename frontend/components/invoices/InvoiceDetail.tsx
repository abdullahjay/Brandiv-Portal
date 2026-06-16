"use client";

import { useState } from "react";
import { useInvoice, sendInvoiceRequest, cancelInvoiceRequest } from "@frontend/hooks/useInvoices";
import Badge from "@frontend/components/ui/Badge";
import RecordPaymentModal from "@frontend/components/invoices/RecordPaymentModal";
import type { Invoice } from "@frontend/types";

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

function fmtDateLong(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function downloadInvoicePdf(invoice: Invoice) {
  const cur = invoice.currency;
  const fmtAmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pdfDiscountAmount = invoice.discountAmount ?? 0;
  const pdfDiscountedSubtotal = invoice.subtotal - pdfDiscountAmount;
  const taxPct = pdfDiscountedSubtotal > 0 ? Math.round((invoice.taxAmount / pdfDiscountedSubtotal) * 100) : 0;

  const statusColors: Record<string, string> = {
    draft: "#888888", sent: "#185FA5", paid: "#2a7a2a", overdue: "#c0392b", cancelled: "#888888",
  };
  const sc = statusColors[invoice.status] ?? "#888888";

  const lineRows = (invoice.lineItems ?? []).map(item => `
    <tr>
      <td class="desc">${item.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
      <td class="num">${item.quantity}</td>
      <td class="num">${cur} ${fmtAmt(item.rate / 100)}</td>
      <td class="num bold">${cur} ${fmtAmt(item.amount / 100)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${invoice.invoiceNumber}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#fff}
body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a18}
.page{padding:48px;max-width:820px;margin:0 auto}
@page{margin:15mm;size:A4}
@media print{.no-print{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:0;max-width:none}}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:48px;height:48px;border-radius:12px;background:#185FA5;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;font-family:Arial,sans-serif;flex-shrink:0;line-height:1}
.company{font-size:18px;font-weight:700;color:#185FA5}
.right-block{text-align:right}
.invoice-word{font-size:26px;font-weight:700;color:#1a1a18;margin-bottom:4px;letter-spacing:-0.5px}
.invoice-num{font-size:14px;color:#555;font-weight:600;margin-bottom:6px}
.status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${sc}22;color:${sc};text-transform:uppercase;letter-spacing:0.05em}
hr{border:none;border-top:1px solid #e8e8e4;margin:24px 0}
.meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px 24px;margin-bottom:32px}
.meta-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:4px}
.meta-value{font-size:13px;color:#1a1a18;font-weight:500;line-height:1.4}
.meta-value.blue{color:#185FA5}
.meta-value.green{color:#2a7a2a}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead tr{border-bottom:2px solid #1a1a18}
th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#aaa;padding:0 0 8px}
th.num{text-align:right}
th.desc{text-align:left}
td{padding:10px 0;border-bottom:1px solid #f0efeb;font-size:13px;color:#1a1a18;vertical-align:top}
td.num{text-align:right;color:#555}
td.bold{font-weight:600;color:#1a1a18}
td.desc{color:#1a1a18}
.totals{display:flex;justify-content:flex-end;margin-top:4px}
.totals-inner{width:280px}
.trow{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#666}
.trow.grand{border-top:2px solid #1a1a18;margin-top:8px;padding-top:10px;font-size:17px;font-weight:700;color:#1a1a18}
.notes-box{background:#f8f8f6;border-radius:8px;padding:14px 16px;margin-top:28px}
.notes-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:8px}
.notes-text{font-size:12px;color:#555;line-height:1.7}
.footer{text-align:center;margin-top:48px;font-size:11px;color:#ccc}
.save-btn{position:fixed;top:20px;right:20px;padding:10px 22px;background:#185FA5;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
.save-btn:hover{background:#1450a0}
</style>
</head>
<body>
<div class="page">
  <button class="save-btn no-print" onclick="window.print()">⬇ Save as PDF</button>

  <div class="header">
    <div class="brand">
      <div class="logo">B</div>
      <div class="company">Brandiv Labs</div>
    </div>
    <div class="right-block">
      <div class="invoice-word">INVOICE</div>
      <div class="invoice-num">${invoice.invoiceNumber}</div>
      <span class="status">${invoice.status}</span>
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <div class="meta-label">Bill To</div>
      <div class="meta-value blue">${(invoice.client?.companyName ?? "—").replace(/</g, "&lt;")}</div>
    </div>
    <div>
      <div class="meta-label">Project</div>
      <div class="meta-value">${(invoice.project?.name ?? "—").replace(/</g, "&lt;")}</div>
    </div>
    <div>
      <div class="meta-label">Currency</div>
      <div class="meta-value">${cur}</div>
    </div>
    <div>
      <div class="meta-label">Issue Date</div>
      <div class="meta-value">${fmtDateLong(invoice.issueDate)}</div>
    </div>
    <div>
      <div class="meta-label">Due Date</div>
      <div class="meta-value">${fmtDateLong(invoice.dueDate)}</div>
    </div>
    <div>
      <div class="meta-label">Payment Terms</div>
      <div class="meta-value">${(invoice.paymentTerms ?? "—").replace(/</g, "&lt;")}</div>
    </div>
    ${invoice.paymentNumber > 1 ? `<div><div class="meta-label">Payment #</div><div class="meta-value">${invoice.paymentNumber}</div></div>` : ""}
    ${invoice.paidAt ? `<div><div class="meta-label">Paid On</div><div class="meta-value green">${fmtDateLong(invoice.paidAt)}</div></div>` : ""}
  </div>

  <hr>

  <table>
    <thead>
      <tr>
        <th class="desc">Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-inner">
      <div class="trow"><span>Subtotal</span><span>${cur} ${fmtAmt(invoice.subtotal / 100)}</span></div>
      ${pdfDiscountAmount > 0 ? `<div class="trow" style="color:#c0392b"><span>${invoice.discountType === "pct" ? `Discount (${invoice.discountValue}%)` : "Discount"}</span><span>− ${cur} ${fmtAmt(pdfDiscountAmount / 100)}</span></div>` : ""}
      ${invoice.taxAmount > 0 ? `<div class="trow"><span>Tax (${taxPct}%)</span><span>${cur} ${fmtAmt(invoice.taxAmount / 100)}</span></div>` : ""}
      <div class="trow grand"><span>Total</span><span>${cur} ${fmtAmt(invoice.totalAmount / 100)}</span></div>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes-box"><div class="notes-label">Notes</div><div class="notes-text">${invoice.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div></div>` : ""}

  <div class="footer">Generated by Brandiv Labs CRM</div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

  const discountedSubtotal = invoice.subtotal - (invoice.discountAmount ?? 0);
  const taxPct = discountedSubtotal > 0
    ? Math.round((invoice.taxAmount / discountedSubtotal) * 100)
    : 0;
  const hasDiscount = (invoice.discountAmount ?? 0) > 0;

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
              <button className="btn-outline" onClick={() => downloadInvoicePdf(invoice)}>
                <i className="ti ti-download" style={{ fontSize: 12 }} /> Download PDF
              </button>
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
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${hasDiscount ? 4 : 3}, 1fr)`, gap: 12, marginBottom: 18 }}>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Subtotal</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--t1)" }}>
              {invoice.currency} {fmt(invoice.subtotal / 100)}
            </div>
          </div>
          {hasDiscount && (
            <div className="metric-card">
              <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>{invoice.discountType === "pct" ? `Discount (${invoice.discountValue}%)` : "Discount"}</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: "var(--red)" }}>
                − {invoice.currency} {fmt((invoice.discountAmount ?? 0) / 100)}
              </div>
            </div>
          )}
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
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--t2)" }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 500 }}>{invoice.currency} {fmt(invoice.subtotal / 100)}</span>
              </div>
              {hasDiscount && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--red)" }}>
                  <span>{invoice.discountType === "pct" ? `Discount (${invoice.discountValue}%)` : "Discount"}</span>
                  <span>− {invoice.currency} {fmt((invoice.discountAmount ?? 0) / 100)}</span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--t2)" }}>
                  <span>Tax ({taxPct}%)</span>
                  <span>{invoice.currency} {fmt(invoice.taxAmount / 100)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "var(--t1)", borderTop: "0.5px solid var(--b3)", paddingTop: 6, marginTop: 2 }}>
                <span>Total</span>
                <span>{invoice.currency} {fmt(invoice.totalAmount / 100)}</span>
              </div>
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
