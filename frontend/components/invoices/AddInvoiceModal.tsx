"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createInvoiceRequest } from "@frontend/hooks/useInvoices";
import { useAllLookups, lookupOptions } from "@frontend/hooks/useLookups";
import type { Invoice, ApiResponse } from "@frontend/types";

interface AddInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
  defaultClientId?: string;
  defaultProjectId?: string;
}

interface LineItemDraft {
  description: string;
  quantity: string;
  rate: string;
}

interface FormData {
  clientId: string;
  projectId: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  taxPct: string;
  paymentNumber: string;
  notes: string;
  lineItems: LineItemDraft[];
}

interface ClientOption { id: string; companyName: string; currency: string }
interface ProjectOption { id: string; name: string }

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
      <label>
        {label}
        {required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function lineTotal(item: LineItemDraft): number {
  return (parseInt(item.quantity, 10) || 0) * (parseFloat(item.rate) || 0);
}

const today = new Date().toISOString().slice(0, 10);
const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

const PAYMENT_TERMS_OPTIONS = [
  "Due on receipt",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "50% upfront, 50% on delivery",
];

const EMPTY_LINE: LineItemDraft = { description: "", quantity: "1", rate: "" };

const EMPTY_FORM: FormData = {
  clientId: "",
  projectId: "",
  currency: "USD",
  issueDate: today,
  dueDate: in30,
  paymentTerms: "Net 30",
  taxPct: "0",
  paymentNumber: "1",
  notes: "",
  lineItems: [{ ...EMPTY_LINE }],
};

export default function AddInvoiceModal({
  open, onClose, onCreated, defaultClientId, defaultProjectId,
}: AddInvoiceModalProps) {
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM, clientId: defaultClientId ?? "", projectId: defaultProjectId ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [customPaymentTerms, setCustomPaymentTerms] = useState(false);

  const { data: lookupMap, loading: lookupsLoading } = useAllLookups();

  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY_FORM, clientId: defaultClientId ?? "", projectId: defaultProjectId ?? "" });
      setError(null);
      setCustomPaymentTerms(false);
    }
  }, [open, defaultClientId, defaultProjectId]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/clients?pageSize=100")
      .then((r) => r.json())
      .then((json: ApiResponse<{ items: ClientOption[] }>) => {
        if (json.success) {
          setClients(json.data!.items);
          // Auto-fill currency from client if defaultClientId set
          if (defaultClientId) {
            const cl = json.data!.items.find((c) => c.id === defaultClientId);
            if (cl?.currency) set("currency", cl.currency);
          }
        }
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!form.clientId) { setProjects([]); return; }
    fetch(`/api/projects?clientId=${form.clientId}&status=active&pageSize=100`)
      .then((r) => r.json())
      .then((json: ApiResponse<{ items: ProjectOption[] }>) => {
        if (json.success) setProjects(json.data!.items);
      })
      .catch(() => {});
  }, [form.clientId]);

  // Auto-fill currency when client changes
  useEffect(() => {
    if (!form.clientId) return;
    const cl = clients.find((c) => c.id === form.clientId);
    if (cl?.currency) set("currency", cl.currency);
  }, [form.clientId, clients]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setLine(idx: number, field: keyof LineItemDraft, value: string) {
    setForm((prev) => {
      const items = [...prev.lineItems];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, lineItems: items };
    });
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lineItems: [...prev.lineItems, { ...EMPTY_LINE }] }));
  }

  function removeLine(idx: number) {
    setForm((prev) => ({ ...prev, lineItems: prev.lineItems.filter((_, i) => i !== idx) }));
  }

  const subtotal = form.lineItems.reduce((s, item) => s + lineTotal(item), 0);
  const taxPct = parseFloat(form.taxPct) || 0;
  const taxAmount = subtotal * taxPct / 100;
  const totalAmount = subtotal + taxAmount;

  async function handleSubmit() {
    if (!form.clientId) return;
    setSaving(true);
    setError(null);
    try {
      const invoice = await createInvoiceRequest({
        clientId: form.clientId,
        projectId: form.projectId || undefined,
        currency: form.currency,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        paymentTerms: form.paymentTerms || undefined,
        taxPct,
        paymentNumber: parseInt(form.paymentNumber, 10) || 1,
        notes: form.notes || undefined,
        lineItems: form.lineItems
          .filter((i) => i.description.trim())
          .map((i) => ({
            description: i.description.trim(),
            quantity: parseInt(i.quantity, 10) || 1,
            rate: parseFloat(i.rate) || 0,
          })),
      });
      onCreated(invoice);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  }

  const validLines = form.lineItems.filter((i) => i.description.trim() && parseFloat(i.rate) >= 0);
  const canSubmit = !!(form.clientId && form.issueDate && form.dueDate && validLines.length > 0);
  const currencies = lookupOptions(lookupMap, "currency");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New invoice"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !canSubmit} style={{ opacity: canSubmit ? 1 : 0.5 }}>
            {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Creating…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Create invoice</>}
          </button>
        </>
      }
    >
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <SectionHead>Client &amp; project</SectionHead>

      <div className="f2">
        <Field label="Client" required>
          <select value={form.clientId} onChange={(e) => { set("clientId", e.target.value); set("projectId", ""); }}>
            <option value="">Select client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
        </Field>
        <Field label="Project">
          <select value={form.projectId} onChange={(e) => set("projectId", e.target.value)} disabled={!form.clientId}>
            <option value="">No linked project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      <SectionHead>Invoice details</SectionHead>

      <div className="f3">
        <Field label="Currency" required>
          <select value={form.currency} onChange={(e) => set("currency", e.target.value)} disabled={lookupsLoading}>
            {currencies.length > 0
              ? currencies.map((o) => <option key={o.id} value={o.value}>{o.label}</option>)
              : <><option value="USD">USD</option><option value="GBP">GBP</option><option value="EUR">EUR</option><option value="AED">AED</option><option value="PKR">PKR</option></>
            }
          </select>
        </Field>
        <Field label="Payment #">
          <input type="number" min="1" value={form.paymentNumber} onChange={(e) => set("paymentNumber", e.target.value)} />
        </Field>
        <Field label="Tax (%)">
          <input type="number" min="0" max="100" step="0.5" value={form.taxPct} onChange={(e) => set("taxPct", e.target.value)} />
        </Field>
      </div>

      <div className="f2">
        <Field label="Issue date" required>
          <input type="date" value={form.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
        </Field>
        <Field label="Due date" required>
          <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </Field>
      </div>

      <Field label="Payment terms">
        {customPaymentTerms ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input
              value={form.paymentTerms}
              onChange={(e) => set("paymentTerms", e.target.value)}
              placeholder="Custom terms"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => { setCustomPaymentTerms(false); set("paymentTerms", "Net 30"); }}
              style={{ padding: "0 6px", background: "none", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", cursor: "pointer", color: "var(--t3)", flexShrink: 0 }}
            >
              <i className="ti ti-x" style={{ fontSize: 11 }} />
            </button>
          </div>
        ) : (
          <select
            value={PAYMENT_TERMS_OPTIONS.includes(form.paymentTerms) ? form.paymentTerms : "__custom"}
            onChange={(e) => {
              if (e.target.value === "__custom") { setCustomPaymentTerms(true); set("paymentTerms", ""); }
              else set("paymentTerms", e.target.value);
            }}
          >
            {PAYMENT_TERMS_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            <option value="__custom">Custom…</option>
          </select>
        )}
      </Field>

      {/* Line items */}
      <SectionHead>Line items</SectionHead>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 96px 80px 28px", gap: "0 8px", marginBottom: 4, padding: "0 2px" }}>
        {["Description", "Qty", "Rate", "Amount", ""].map((h, i) => (
          <div key={i} style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i === 3 ? "right" : "left" }}>{h}</div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {form.lineItems.map((item, idx) => {
          const total = lineTotal(item);
          return (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 56px 96px 80px 28px",
                gap: "0 8px",
                alignItems: "center",
                background: idx % 2 === 0 ? "var(--bg2)" : "transparent",
                borderRadius: "var(--rm)",
                padding: "4px 2px",
              }}
            >
              <input
                value={item.description}
                onChange={(e) => setLine(idx, "description", e.target.value)}
                placeholder={`Line item ${idx + 1}`}
                style={{ height: 30, fontSize: 12 }}
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => setLine(idx, "quantity", e.target.value)}
                style={{ height: 30, fontSize: 12, textAlign: "center" }}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.rate}
                onChange={(e) => setLine(idx, "rate", e.target.value)}
                placeholder="0.00"
                style={{ height: 30, fontSize: 12 }}
              />
              <div style={{ fontSize: 12, fontWeight: 500, color: total > 0 ? "var(--t1)" : "var(--t3)", textAlign: "right", paddingRight: 4 }}>
                {total > 0 ? total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
              </div>
              <button
                onClick={() => removeLine(idx)}
                disabled={form.lineItems.length === 1}
                style={{ height: 28, width: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: form.lineItems.length === 1 ? "not-allowed" : "pointer", color: form.lineItems.length === 1 ? "var(--t3)" : "var(--red)", padding: 0, borderRadius: "var(--rm)" }}
              >
                <i className="ti ti-trash" style={{ fontSize: 12 }} />
              </button>
            </div>
          );
        })}
      </div>

      <button className="btn-outline" style={{ height: 28, fontSize: 11, width: "100%", marginBottom: 4 }} onClick={addLine}>
        <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add line item
      </button>

      {/* Totals */}
      <div style={{ background: "var(--blue-bg)", border: "0.5px solid #85B7EB", borderRadius: "var(--rm)", padding: "10px 14px", marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>
          <span>Subtotal</span>
          <span style={{ fontWeight: 500 }}>{form.currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        {taxPct > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>
            <span>Tax ({taxPct}%)</span>
            <span>{form.currency} {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--blue)", borderTop: "0.5px solid #85B7EB", paddingTop: 8, marginTop: 4 }}>
          <span>Total</span>
          <span>{form.currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <SectionHead>Notes</SectionHead>
      <Field label="Notes">
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Payment instructions, terms, or any other notes…" rows={2} />
      </Field>
    </Modal>
  );
}
