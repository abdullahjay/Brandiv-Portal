"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createIncomeRequest } from "@frontend/hooks/useIncome";
import { DEFAULT_FX_RATES } from "@frontend/constants";
import type { IncomeRecord, ApiResponse, CrmAccount } from "@frontend/types";

interface AddIncomeModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (record: IncomeRecord) => void;
}

interface FormData {
  clientId: string;
  invoiceId: string;
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

interface ClientOption { id: string; companyName: string; currency: string }
interface InvoiceOption { id: string; invoiceNumber: string; totalAmount: number; currency: string; status: string }
interface UserOption { id: string; name: string }

const today = new Date().toISOString().slice(0, 10);

const EMPTY: FormData = {
  clientId: "", invoiceId: "", originalAmount: "", originalCurrency: "USD",
  exchangeRate: String(DEFAULT_FX_RATES["USD"] ?? 278.5), rateSource: "Manual entry",
  whtPct: "0", gstPct: "0", bankChargesPkr: "0", paymentMethod: "",
  transactionRef: "", receivedAt: today, incomeType: "", notes: "", destinationAccountId: "",
};

const CURRENCIES = ["USD", "GBP", "EUR", "AED", "PKR"];
const PAYMENT_METHODS = ["Bank Transfer", "Wise", "PayPal", "Payoneer", "Crypto", "Cheque", "Cash", "Other"];
const INCOME_TYPES = ["Client payment", "Milestone payment", "Retainer fee", "Consulting", "License fee", "Support", "Other"];
const RATE_SOURCES = ["Manual entry", "SBP rate", "Bank rate", "Other"];

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

function fmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

export default function AddIncomeModal({ open, onClose, onCreated }: AddIncomeModalProps) {
  const [form, setForm] = useState<FormData>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [operatingAccounts, setOperatingAccounts] = useState<CrmAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsChecked, setAccountsChecked] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) { setForm({ ...EMPTY }); setError(null); setInvoices([]); setAccountsChecked(false); }
  }, [open]);

  // On open: fetch operating accounts + clients
  useEffect(() => {
    if (!open) return;
    setAccountsLoading(true);

    Promise.all([
      fetch("/api/accounts?type=operating")
        .then(r => r.json())
        .then((json: ApiResponse<CrmAccount[]>) => {
          const accs = json.data ?? [];
          setOperatingAccounts(accs);
          const def = accs.find(a => a.isDefaultOperating) ?? accs[0] ?? null;
          if (def) setForm(prev => ({ ...prev, destinationAccountId: def.id }));
        }),
      fetch("/api/clients?pageSize=100")
        .then(r => r.json())
        .then((json: ApiResponse<{ items: ClientOption[] }>) => {
          if (json.success) setClients(json.data!.items);
        }),
    ]).finally(() => { setAccountsLoading(false); setAccountsChecked(true); });
  }, [open]);

  // Fetch invoices when client changes
  useEffect(() => {
    if (!form.clientId) { setInvoices([]); return; }
    fetch(`/api/invoices?clientId=${form.clientId}&pageSize=100`)
      .then(r => r.json())
      .then((json: ApiResponse<{ items: InvoiceOption[] }>) => {
        if (json.success) {
          setInvoices(json.data!.items.filter(inv => inv.status !== "paid" && inv.status !== "cancelled"));
        }
      }).catch(() => {});
  }, [form.clientId]);

  // Auto-fill amount + currency when invoice selected
  useEffect(() => {
    if (!form.invoiceId) return;
    const inv = invoices.find(i => i.id === form.invoiceId);
    if (inv) { set("originalAmount", String(inv.totalAmount / 100)); set("originalCurrency", inv.currency); }
  }, [form.invoiceId]);

  // Auto-fill rate when currency changes
  useEffect(() => {
    if (form.originalCurrency === "PKR") set("exchangeRate", "1");
    else { const r = DEFAULT_FX_RATES[form.originalCurrency]; if (r) set("exchangeRate", String(r)); }
  }, [form.originalCurrency]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Live calculations
  const amount = parseFloat(form.originalAmount) || 0;
  const rate = parseFloat(form.exchangeRate) || 0;
  const grossPkr = amount * rate;
  const whtAmt = grossPkr * (parseFloat(form.whtPct) || 0) / 100;
  const gstAmt = grossPkr * (parseFloat(form.gstPct) || 0) / 100;
  const bankCharges = parseFloat(form.bankChargesPkr) || 0;
  const netPkr = grossPkr - whtAmt - gstAmt - bankCharges;

  const defaultOpAcc = operatingAccounts.find(a => a.isDefaultOperating) ?? operatingAccounts[0] ?? null;
  const hasOpAccount = !!defaultOpAcc;

  async function handleSubmit() {
    setSaving(true); setError(null);
    try {
      const record = await createIncomeRequest({
        clientId: form.clientId,
        invoiceId: form.invoiceId || undefined,
        destinationAccountId: form.destinationAccountId || undefined,
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
      onCreated(record);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record income");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!(hasOpAccount && form.clientId && amount > 0 && rate > 0 && form.receivedAt && netPkr > 0);

  const footer = !hasOpAccount && accountsChecked ? (
    <button className="btn-outline" onClick={onClose}>Close</button>
  ) : (
    <>
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || !canSubmit || accountsLoading} style={{ opacity: canSubmit ? 1 : 0.5 }}>
        {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save income record</>}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Record income" width="wide" footer={footer}>
      {accountsLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: "24px 0", color: "var(--t3)", fontSize: 12 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 16 }} /> Loading…
        </div>
      )}

      {!accountsLoading && accountsChecked && !hasOpAccount && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" }}>
          <i className="ti ti-building-bank" style={{ fontSize: 36, color: "var(--t3)" }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>No operating account set up</div>
          <div style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", maxWidth: 320 }}>
            Go to <span style={{ color: "var(--blue)" }}>Accounts</span> and create an operating account before recording income.
          </div>
        </div>
      )}

      {!accountsLoading && hasOpAccount && (
        <>
          {error && (
            <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          {/* Info banner */}
          <div style={{ background: "var(--blue-bg)", border: "0.5px solid #85B7EB", borderRadius: "var(--rm)", padding: "10px 12px", marginBottom: 16, display: "flex", gap: 8, fontSize: 11, color: "var(--blue)" }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }} />
            <span>Amount is converted to PKR using the rate you enter. Tax and charges are deducted before the net amount lands in the Operating Account.</span>
          </div>

          {/* Client + Invoice */}
          <div className="f2">
            <Field label="Client" required>
              <select value={form.clientId} onChange={(e) => { set("clientId", e.target.value); set("invoiceId", ""); }}>
                <option value="">Select client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </Field>
            <Field label="Invoice">
              <select value={form.invoiceId} onChange={(e) => set("invoiceId", e.target.value)} disabled={!form.clientId}>
                <option value="">{form.clientId ? "No invoice (direct)" : "Select client first"}</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNumber} — {inv.currency} {(inv.totalAmount / 100).toLocaleString()}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── PAYMENT RECEIVED ─────────────────────────────────────── */}
          <SectionHead>Payment received</SectionHead>

          <div className="f3">
            <Field label="Amount" required>
              <input type="number" min="0" step="0.01" value={form.originalAmount} onChange={(e) => set("originalAmount", e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Currency" required>
              <select value={form.originalCurrency} onChange={(e) => set("originalCurrency", e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
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
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Transaction ref">
              <input value={form.transactionRef} onChange={(e) => set("transactionRef", e.target.value)} placeholder="TXN-…" />
            </Field>
          </div>

          {/* ── FX CONVERSION TO PKR ─────────────────────────────────── */}
          <SectionHead>FX conversion to PKR</SectionHead>

          <div className="f2">
            <Field label={`Rate — 1 ${form.originalCurrency} = PKR`} required>
              <input type="number" min="0" step="0.0001" value={form.exchangeRate} onChange={(e) => set("exchangeRate", e.target.value)} placeholder="278.50" />
            </Field>
            <Field label="Rate source">
              <select value={form.rateSource} onChange={(e) => set("rateSource", e.target.value)}>
                {RATE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* ── TAX & DEDUCTIONS ─────────────────────────────────────── */}
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
                <span style={{ color: whtAmt > 0 ? "var(--red)" : "var(--t3)" }}>{whtAmt > 0 ? `− PKR ${fmt(whtAmt)}` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--t2)" }}>GST deducted</span>
                <span style={{ color: gstAmt > 0 ? "var(--red)" : "var(--t3)" }}>{gstAmt > 0 ? `− PKR ${fmt(gstAmt)}` : "—"}</span>
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

          {/* ── ACCOUNT & NOTES ──────────────────────────────────────── */}
          <SectionHead>Account &amp; notes</SectionHead>

          <div className="f2">
            <Field label="Destination account">
              <select value={form.destinationAccountId} onChange={(e) => set("destinationAccountId", e.target.value)}>
                {operatingAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.isDefaultOperating ? " (default)" : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Income type">
              <select value={form.incomeType} onChange={(e) => set("incomeType", e.target.value)}>
                <option value="">Select type</option>
                {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any notes about this payment…" />
          </Field>
        </>
      )}
    </Modal>
  );
}
