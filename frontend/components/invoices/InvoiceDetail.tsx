"use client";

import { useState } from "react";
import { useInvoice, sendInvoiceRequest, cancelInvoiceRequest } from "@frontend/hooks/useInvoices";
import { useSettings } from "@frontend/hooks/useSettings";
import Badge from "@frontend/components/ui/Badge";
import RecordPaymentModal from "@frontend/components/invoices/RecordPaymentModal";
import AddInvoiceModal from "@frontend/components/invoices/AddInvoiceModal";
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

function downloadInvoicePdf(invoice: Invoice, opts: {
  logoUrl?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyNtn?: string | null;
} = {}) {
  const cur = invoice.currency;
  const fmtAmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pdfDiscountAmount = invoice.discountAmount ?? 0;
  const pdfDiscountedSubtotal = invoice.subtotal - pdfDiscountAmount;
  const taxPct = pdfDiscountedSubtotal > 0 ? Math.round((invoice.taxAmount / pdfDiscountedSubtotal) * 100) : 0;
  const origin = window.location.origin;
  const logoUrl = opts.logoUrl
    ? (opts.logoUrl.startsWith("http") ? opts.logoUrl : `${origin}${opts.logoUrl}`)
    : `${origin}/uploads/logo.webp`;
  const companyName = opts.companyName || "Brandiv Labs";
  const companyAddress = opts.companyAddress
    ? opts.companyAddress.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")
    : null;
  const companyNtn = opts.companyNtn || null;

  const lineRows = (invoice.lineItems ?? []).map(item => `
    <tr>
      <td><div class="item-name">${item.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></td>
      <td class="num">${item.quantity}</td>
      <td class="num">${fmtAmt(item.rate / 100)}</td>
      <td class="amount">${fmtAmt(item.amount / 100)}</td>
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
.page{padding:40px 48px;max-width:860px;margin:0 auto}
@page{margin:12mm;size:A4}
@media print{.no-print{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:0;max-width:none}}
.top-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
.logo-img{height:52px;width:auto;max-width:220px;object-fit:contain}
.company-fb{font-size:22px;font-weight:700;color:#1a1a18;display:none}
.right-header{text-align:right}
.invoice-title{font-size:40px;font-weight:700;color:#1a1a18;letter-spacing:3px;line-height:1;margin-bottom:10px}
.co-name-p{font-size:13px;font-weight:700;color:#1a1a18;line-height:1.6}
.co-sub-p{font-size:11px;color:#555;line-height:1.6}
.bill-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;gap:32px}
.bill-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;margin-bottom:6px}
.bill-name{font-size:14px;font-weight:700;color:#1a1a18;margin-bottom:3px}
.bill-sub{font-size:12px;color:#555;line-height:1.5}
.meta-tbl{border-collapse:collapse}
.meta-tbl td{font-size:12px;padding:4px 10px;vertical-align:middle}
.meta-tbl td.ml{color:#666;text-align:right;white-space:nowrap;font-weight:400}
.meta-tbl td.mv{font-weight:600;color:#1a1a18;text-align:right;white-space:nowrap}
.meta-tbl tr.adu td{background:#edf2f7;padding:7px 10px}
.meta-tbl tr.adu td.ml{color:#1a3a4a;font-weight:600}
.meta-tbl tr.adu td.mv{color:#1a3a4a;font-size:13px}
table.items{width:100%;border-collapse:collapse;margin-bottom:24px}
table.items thead tr{background:#1a3a4a}
table.items th{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#fff;padding:11px 14px;text-align:left}
table.items th.num{text-align:right}
table.items td{padding:11px 14px;border-bottom:1px solid #eee;vertical-align:top}
table.items td.num{text-align:right;font-size:13px;color:#444}
table.items td.amount{text-align:right;font-size:13px;font-weight:700;color:#1a1a18}
.item-name{font-size:13px;font-weight:700;color:#1a1a18}
.totals-wrap{display:flex;justify-content:flex-end;margin-bottom:28px}
.totals-inner{min-width:310px}
.trow{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#555}
.trow .val{min-width:110px;text-align:right;font-weight:500}
.trow.disc .val{color:#c0392b}
.tsep{border:none;border-top:1.5px solid #1a1a18;margin:8px 0}
.trow.gtotal{font-size:14px;font-weight:700;color:#1a1a18}
.trow.amtdue{font-size:14px;font-weight:700;color:#1a1a18;border-top:1.5px solid #1a1a18;padding-top:10px;margin-top:2px}
.notes-box{background:#f8f8f6;border-radius:6px;padding:14px 16px;margin-bottom:24px}
.notes-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#aaa;margin-bottom:8px}
.notes-text{font-size:12px;color:#555;line-height:1.7}
.footer{text-align:center;margin-top:32px;font-size:10px;color:#ccc}
.save-btn{position:fixed;top:20px;right:20px;padding:10px 22px;background:#1a3a4a;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.save-btn:hover{background:#0f2535}
</style>
</head>
<body>
<div class="page">
  <button class="save-btn no-print" onclick="window.print()">⬇ Save as PDF</button>

  <div class="top-header">
    <div>
      <img src="${logoUrl}" class="logo-img" alt="${companyName}" onerror="this.onerror=null;this.style.display='none';document.getElementById('co-fb').style.display='block'">
      <div id="co-fb" class="company-fb">${companyName}</div>
    </div>
    <div class="right-header">
      <div class="invoice-title">INVOICE</div>
      <div class="co-name-p">${companyName}</div>
      ${companyAddress ? `<div class="co-sub-p">${companyAddress}</div>` : ""}
      ${companyNtn ? `<div class="co-sub-p">NTN: ${companyNtn}</div>` : ""}
    </div>
  </div>

  <div class="bill-row">
    <div>
      <div class="bill-label">Bill To</div>
      <div class="bill-name">${(invoice.client?.companyName ?? "—").replace(/</g, "&lt;")}</div>
      ${invoice.project?.name ? `<div class="bill-sub">${invoice.project.name.replace(/</g, "&lt;")}</div>` : ""}
    </div>
    <table class="meta-tbl">
      <tr><td class="ml">Invoice Number:</td><td class="mv">${invoice.invoiceNumber}</td></tr>
      <tr><td class="ml">Invoice Date:</td><td class="mv">${fmtDateLong(invoice.issueDate)}</td></tr>
      <tr><td class="ml">Payment Due:</td><td class="mv">${fmtDateLong(invoice.dueDate)}</td></tr>
      ${invoice.paymentTerms ? `<tr><td class="ml">Payment Terms:</td><td class="mv">${invoice.paymentTerms.replace(/</g, "&lt;")}</td></tr>` : ""}
      ${invoice.paymentNumber > 1 ? `<tr><td class="ml">Payment #:</td><td class="mv">${invoice.paymentNumber}</td></tr>` : ""}
      ${invoice.paidAt ? `<tr><td class="ml">Paid On:</td><td class="mv">${fmtDateLong(invoice.paidAt)}</td></tr>` : ""}
      <tr class="adu"><td class="ml">Amount Due (${cur}):</td><td class="mv">${fmtAmt(invoice.totalAmount / 100)}</td></tr>
    </table>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th>Services</th>
        <th class="num">Months</th>
        <th class="num">Price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals-inner">
      <div class="trow"><span>Subtotal:</span><span class="val">${cur} ${fmtAmt(invoice.subtotal / 100)}</span></div>
      ${pdfDiscountAmount > 0 ? `<div class="trow disc"><span>${invoice.discountType === "pct" ? `Discount (${invoice.discountValue}%):` : "Discount:"}</span><span class="val">(${cur} ${fmtAmt(pdfDiscountAmount / 100)})</span></div>` : ""}
      ${invoice.taxAmount > 0 ? `<div class="trow"><span>Tax (${taxPct}%):</span><span class="val">${cur} ${fmtAmt(invoice.taxAmount / 100)}</span></div>` : ""}
      <hr class="tsep">
      <div class="trow gtotal"><span>Total:</span><span class="val">${cur} ${fmtAmt(invoice.totalAmount / 100)}</span></div>
      <div class="trow amtdue"><span>Amount Due (${cur}):</span><span class="val">${fmtAmt(invoice.totalAmount / 100)}</span></div>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes-box"><div class="notes-label">Notes</div><div class="notes-text">${invoice.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div></div>` : ""}

  <div class="footer">Generated by ${companyName} CRM</div>
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
  const { settings } = useSettings();
  const [acting, setActing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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
  const canEdit = invoice.status !== "paid" && invoice.status !== "cancelled";

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
              {canEdit && (
                <button className="btn-outline" onClick={() => setShowEditModal(true)}>
                  <i className="ti ti-pencil" style={{ fontSize: 12 }} /> Edit
                </button>
              )}
              <button className="btn-outline" onClick={() => downloadInvoicePdf(invoice, {
                  logoUrl: settings.logo_url as string | null,
                  companyName: settings.company_name as string | null,
                  companyAddress: settings.company_address as string | null,
                  companyNtn: settings.company_ntn as string | null,
                })}>
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

      {/* Edit invoice modal */}
      {showEditModal && (
        <AddInvoiceModal
          open={showEditModal}
          invoice={invoice}
          onClose={() => setShowEditModal(false)}
          onSaved={async () => {
            setShowEditModal(false);
            await refetch();
            onUpdated?.();
          }}
        />
      )}

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
