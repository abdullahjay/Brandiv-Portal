"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createIncomeRequest } from "@frontend/hooks/useIncome";
import { DEFAULT_FX_RATES } from "@frontend/constants";
import type { Invoice, ApiResponse, Client, CrmAccount } from "@frontend/types";

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onRecorded: () => void;
  invoice: Invoice;
}

interface FormData {
  originalAmount: string;
  originalCurrency: string;
  exchangeRate: string;
  rateSource: string;
  whtPct: string;
  gstPct: string;
  bankChargesPkr: string;
  paymentMethod: string;
  transactionRef: string;
  receivedAt: string;
  incomeType: string;
  notes: string;
  destinationAccountId: string;
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "14px 0 6px", borderBottom: "0.5px solid var(--b3)", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="frow">
      <label>{label}{required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  );
}

const CURRENCIES = ["USD", "GBP", "EUR", "AED", "PKR"];
const PAYMENT_METHODS = ["Bank Transfer", "Wise", "PayPal", "Payoneer", "Crypto", "Cheque", "Cash", "Other"];
const INCOME_TYPES = ["Client payment", "Milestone payment", "Retainer fee", "Consulting", "License fee", "Support", "Other"];
const RATE_SOURCES = ["Manual entry", "SBP rate", "Bank rate", "Other"];
const COMMISSION_RATES: Record<string, number> = { first: 15, recurring: 5 };

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function RecordPaymentModal({ open, onClose, onRecorded, invoice }: RecordPaymentModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<FormData>({
    originalAmount: "",
    originalCurrency: invoice.currency,
    exchangeRate: "",
    rateSource: "Manual entry",
    whtPct: "0",
    gstPct: "0",
    bankChargesPkr: "0",
    paymentMethod: "",
    transactionRef: "",
    receivedAt: today,
    incomeType: "",
    notes: "",
    destinationAccountId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [operatingAccount, setOperatingAccount] = useState<CrmAccount | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsChecked, setAccountsChecked] = useState(false);

  // Reset and pre-fill when modal opens
  useEffect(() => {
    if (!open) { setError(null); return; }
    const amount = invoice.totalAmount / 100;
    const currency = invoice.currency;
    const rate = currency === "PKR" ? "1" : String(DEFAULT_FX_RATES[currency] ?? "");
    setForm({
      originalAmount: String(amount),
      originalCurrency: currency,
      exchangeRate: rate,
      rateSource: "Manual entry",
      whtPct: "0",
      gstPct: "0",
      bankChargesPkr: "0",
      paymentMethod: "",
      transactionRef: "",
      receivedAt: today,
      incomeType: "",
      notes: "",
      destinationAccountId: operatingAccount?.id ?? "",
    });
  }, [open, invoice]);

  // Fetch operating account + client data when modal opens
  useEffect(() => {
    if (!open) return;
    setAccountsLoading(true);
    setAccountsChecked(false);

    Promise.all([
      fetch("/api/accounts?type=operating")
        .then((r) => r.json())
        .then((json: ApiResponse<CrmAccount[]>) => {
          const accs = json.data ?? [];
          const opAcc = accs.find((a) => a.isDefaultOperating) ?? accs[0] ?? null;
          setOperatingAccount(opAcc);
          if (opAcc) setForm((prev) => ({ ...prev, destinationAccountId: opAcc.id }));
          setAccountsChecked(true);
          setAccountsLoading(false);
        }),
      invoice.client?.id
        ? fetch(`/api/clients/${invoice.client.id}`)
            .then((r) => r.json())
            .then((json: ApiResponse<Client>) => { if (json.success) setClientData(json.data!); })
        : Promise.resolve(),
    ]).catch(() => {
      setAccountsChecked(true);
      setAccountsLoading(false);
    });
  }, [open, invoice.client?.id]);

  // Auto-fill rate when currency changes
  useEffect(() => {
    if (form.originalCurrency === "PKR") {
      setForm((prev) => ({ ...prev, exchangeRate: "1" }));
    } else {
      const rate = DEFAULT_FX_RATES[form.originalCurrency];
      if (rate) setForm((prev) => ({ ...prev, exchangeRate: String(rate) }));
    }
  }, [form.originalCurrency]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // PKR calculations
  const rawAmount = parseFloat(form.originalAmount) || 0;
  const fxRate = parseFloat(form.exchangeRate) || 0;
  const whtPct = parseFloat(form.whtPct) || 0;
  const gstPct = parseFloat(form.gstPct) || 0;
  const bankCharges = parseFloat(form.bankChargesPkr) || 0;
  const grossPkr = rawAmount * fxRate;
  const whtPkr = grossPkr * whtPct / 100;
  const gstPkr = grossPkr * gstPct / 100;
  const netPkr = grossPkr - whtPkr - gstPkr - bankCharges;

  // Commission preview
  const hasCommission = clientData?.commissionRule !== "none" && !!clientData?.partner;
  const commissionRate = invoice.paymentNumber === 1 ? COMMISSION_RATES.first : COMMISSION_RATES.recurring;
  const estimatedCommissionPkr = hasCommission ? netPkr * commissionRate / 100 : 0;

  async function handleSubmit() {
    if (!invoice.client?.id || !operatingAccount) return;
    setSaving(true);
    setError(null);
    try {
      await createIncomeRequest({
        clientId: invoice.client.id,
        invoiceId: invoice.id,
        destinationAccountId: form.destinationAccountId || operatingAccount.id,
        originalAmount: parseFloat(form.originalAmount),
        originalCurrency: form.originalCurrency,
        exchangeRate: parseFloat(form.exchangeRate),
        rateSource: form.rateSource || undefined,
        whtPct: parseFloat(form.whtPct) || 0,
        gstPct: parseFloat(form.gstPct) || 0,
        bankChargesPkr: parseFloat(form.bankChargesPkr) || 0,
        paymentMethod: form.paymentMethod || undefined,
        transactionRef: form.transactionRef || undefined,
        receivedAt: form.receivedAt,
        incomeType: form.incomeType || undefined,
        notes: form.notes || undefined,
      });
      onRecorded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!(
    operatingAccount &&
    form.originalAmount && parseFloat(form.originalAmount) > 0 &&
    form.exchangeRate && parseFloat(form.exchangeRate) > 0 &&
    form.receivedAt &&
    netPkr > 0
  );

  const footer = !operatingAccount && accountsChecked ? (
    <button className="btn-outline" onClick={onClose}>Close</button>
  ) : (
    <>
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={saving || !canSubmit || accountsLoading}
        style={{ opacity: canSubmit ? 1 : 0.5 }}
      >
        {saving
          ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</>
          : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save income record</>
        }
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Record payment" width="wide" footer={footer}>
      {accountsLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t3)", padding: "20px 0", justifyContent: "center" }}>
          <i className="ti ti-loader-2" style={{ fontSize: 16 }} />
          <span style={{ fontSize: 12 }}>Loading accounts…</span>
        </div>
      )}

      {!accountsLoading && accountsChecked && !operatingAccount && (
        <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <i className="ti ti-building-bank" style={{ fontSize: 36, color: "var(--t3)" }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>No operating account set up</div>
          <div style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", maxWidth: 320 }}>
            Payments must go to a destination account. Set up an operating account in{" "}
            <span style={{ color: "var(--blue)" }}>Accounts</span> before recording income.
          </div>
        </div>
      )}

      {!accountsLoading && operatingAccount && (
        <>
          {error && (
            <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* Invoice banner */}
          <div style={{ background: "var(--blue-bg)", border: "0.5px solid #85B7EB", borderRadius: "var(--rm)", padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--blue)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{invoice.invoiceNumber}</div>
              <div style={{ opacity: 0.85 }}>
                {invoice.client?.companyName} · {invoice.currency} {(invoice.totalAmount / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} due
                {invoice.paymentNumber > 1 && ` · Payment #${invoice.paymentNumber}`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Destination</div>
              <div style={{ fontWeight: 500 }}>{operatingAccount.name}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Bal: PKR {fmt(operatingAccount.currentBalancePkr / 100)}</div>
            </div>
          </div>

          {/* ── PAYMENT RECEIVED ──────────────────────────────────────── */}
          <SectionHead>Payment received</SectionHead>

          <div className="f3">
            <Field label="Amount" required>
              <input type="number" min="0" step="0.01" value={form.originalAmount} onChange={(e) => set("originalAmount", e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Currency" required>
              <select value={form.originalCurrency} onChange={(e) => set("originalCurrency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Date received" required>
              <input type="date" value={form.receivedAt} onChange={(e) => set("receivedAt", e.target.value)} />
            </Field>
          </div>

          <div className="f2">
            <Field label="Payment method">
              <select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                <option value="">Select method</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Transaction ref">
              <input value={form.transactionRef} onChange={(e) => set("transactionRef", e.target.value)} placeholder="TXN-…" />
            </Field>
          </div>

          {/* ── FX CONVERSION TO PKR ──────────────────────────────────── */}
          <SectionHead>FX conversion to PKR</SectionHead>

          <div className="f2">
            <Field label={`Rate — 1 ${form.originalCurrency} = PKR`} required>
              <input type="number" min="0" step="0.0001" value={form.exchangeRate} onChange={(e) => set("exchangeRate", e.target.value)} placeholder="278.50" />
            </Field>
            <Field label="Rate source">
              <select value={form.rateSource} onChange={(e) => set("rateSource", e.target.value)}>
                {RATE_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* ── TAX & DEDUCTIONS ──────────────────────────────────────── */}
          <SectionHead>Tax &amp; deductions</SectionHead>

          <div className="f3">
            <Field label="WHT %">
              <input type="number" min="0" max="100" step="0.01" value={form.whtPct} onChange={(e) => set("whtPct", e.target.value)} placeholder="0" />
            </Field>
            <Field label="GST %">
              <input type="number" min="0" max="100" step="0.01" value={form.gstPct} onChange={(e) => set("gstPct", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Bank charges (PKR)">
              <input type="number" min="0" step="1" value={form.bankChargesPkr} onChange={(e) => set("bankChargesPkr", e.target.value)} placeholder="0" />
            </Field>
          </div>

          {/* PKR breakdown box */}
          <div style={{ background: "var(--blue-bg)", border: "0.5px solid #85B7EB", borderRadius: "var(--rm)", padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--t2)" }}>Gross PKR</span>
                <span style={{ color: "var(--t1)", fontWeight: 500 }}>{grossPkr > 0 ? `PKR ${fmt(grossPkr)}` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--t2)" }}>WHT deducted</span>
                <span style={{ color: whtPkr > 0 ? "var(--red)" : "var(--t3)" }}>{whtPkr > 0 ? `− PKR ${fmt(whtPkr)}` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--t2)" }}>GST deducted</span>
                <span style={{ color: gstPkr > 0 ? "var(--red)" : "var(--t3)" }}>{gstPkr > 0 ? `− PKR ${fmt(gstPkr)}` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--t2)" }}>Bank charges</span>
                <span style={{ color: bankCharges > 0 ? "var(--red)" : "var(--t3)" }}>{bankCharges > 0 ? `− PKR ${fmt(bankCharges)}` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "0.5px solid #85B7EB", paddingTop: 8, marginTop: 2 }}>
                <span style={{ fontWeight: 600, color: "var(--blue)" }}>Net to Operating Account</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: netPkr > 0 ? "var(--blue)" : "var(--t3)" }}>
                  {netPkr > 0 ? `PKR ${fmt(netPkr)}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* ── ACCOUNT & NOTES ───────────────────────────────────────── */}
          <SectionHead>Account &amp; notes</SectionHead>

          <Field label="Income type">
            <select value={form.incomeType} onChange={(e) => set("incomeType", e.target.value)}>
              <option value="">Select type</option>
              {INCOME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any notes about this payment…" />
          </Field>

          {/* Commission preview */}
          {hasCommission && netPkr > 0 && (
            <div style={{ background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rm)", padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4 }}>
              <i className="ti ti-percentage" style={{ fontSize: 14, color: "var(--green)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--green)" }}>
                  Commission will be calculated for {clientData?.partner?.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--green)", marginTop: 2, opacity: 0.85 }}>
                  {commissionRate}% {invoice.paymentNumber === 1 ? "(first payment)" : "(recurring)"} of net PKR ≈ PKR {fmt(estimatedCommissionPkr)}
                </div>
              </div>
            </div>
          )}

          {clientData && !hasCommission && (
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}>
              <i className="ti ti-info-circle" style={{ fontSize: 12 }} /> No commission applies to this client
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
