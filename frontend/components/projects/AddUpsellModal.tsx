"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createUpsellRequest, updateUpsellRequest } from "@frontend/hooks/useUpsells";
import { useAccounts } from "@frontend/hooks/useAccounts";
import type { ProjectUpsell, ApiResponse } from "@frontend/types";

interface AddUpsellModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** The project's currency (e.g. "USD") — upsell amounts are entered in this currency, matching the project's own value field. */
  currency: string;
  upsell?: ProjectUpsell | null;
  onSaved: () => void;
  /** Prefills the amount (in whole units, not paise) when creating a new upsell — e.g. from a project value-increase delta. */
  initialAmountPkr?: number;
  initialTitle?: string;
}

interface FormData {
  title: string;
  description: string;
  billingMode: "one_time" | "recurring";
  amountPkr: string;
  earnerAccountId: string;
  commissionRatePct: string;
  managingPartnerId: string;
  managingCommissionRatePct: string;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="frow">
      <label>{label}{required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  );
}

const EMPTY_FORM: FormData = {
  title: "",
  description: "",
  billingMode: "one_time",
  amountPkr: "",
  earnerAccountId: "",
  commissionRatePct: "10",
  managingPartnerId: "",
  managingCommissionRatePct: "0",
};

export default function AddUpsellModal({ open, onClose, projectId, currency, upsell, onSaved, initialAmountPkr, initialTitle }: AddUpsellModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: stakeholders } = useAccounts("stakeholder");

  useEffect(() => {
    if (!open) { setError(null); return; }
    if (upsell) {
      setForm({
        title: upsell.title,
        description: upsell.description ?? "",
        billingMode: upsell.billingMode,
        amountPkr: String(upsell.amountPkr / 100),
        earnerAccountId: upsell.earnerAccountId,
        commissionRatePct: String(upsell.commissionRatePct),
        managingPartnerId: upsell.managingPartnerId ?? "",
        managingCommissionRatePct: String(upsell.managingCommissionRatePct ?? 0),
      });
    } else {
      // Pull default rates from settings
      fetch("/api/settings")
        .then((r) => r.json())
        .then((json: ApiResponse<Record<string, unknown>>) => {
          if (json.success && json.data) {
            const s = json.data as Record<string, unknown>;
            const rate = Number(s.upsell_commission_rate ?? 10);
            const managingRate = Number(s.upsell_managing_commission_rate ?? 0);
            setForm({
              ...EMPTY_FORM,
              title: initialTitle ?? EMPTY_FORM.title,
              amountPkr: initialAmountPkr !== undefined ? String(initialAmountPkr) : EMPTY_FORM.amountPkr,
              commissionRatePct: !isNaN(rate) ? String(rate) : "10",
              managingCommissionRatePct: !isNaN(managingRate) ? String(managingRate) : "0",
            });
          }
        })
        .catch(() => setForm({
          ...EMPTY_FORM,
          title: initialTitle ?? EMPTY_FORM.title,
          amountPkr: initialAmountPkr !== undefined ? String(initialAmountPkr) : EMPTY_FORM.amountPkr,
        }));
    }
  }, [open, upsell, initialAmountPkr, initialTitle]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        billingMode: form.billingMode,
        amountPkr: parseFloat(form.amountPkr) || 0,
        earnerAccountId: form.earnerAccountId,
        commissionRatePct: parseFloat(form.commissionRatePct) || 0,
        managingPartnerId: form.managingPartnerId || undefined,
        managingCommissionRatePct: parseFloat(form.managingCommissionRatePct) || 0,
      };
      if (upsell) {
        await updateUpsellRequest(projectId, upsell.id, payload);
      } else {
        await createUpsellRequest(projectId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save upsell");
    } finally {
      setSaving(false);
    }
  }

  const amount = parseFloat(form.amountPkr) || 0;
  const rate = parseFloat(form.commissionRatePct) || 0;
  const managingRate = parseFloat(form.managingCommissionRatePct) || 0;
  const commissionPreview = amount * rate / 100;
  const managingCommissionPreview = amount * managingRate / 100;

  const canSubmit = !!(form.title.trim() && amount > 0 && form.earnerAccountId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={upsell ? "Edit upsell" : "Add upsell"}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !canSubmit} style={{ opacity: canSubmit ? 1 : 0.5 }}>
            {saving
              ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</>
              : <><i className="ti ti-check" style={{ fontSize: 12 }} /> {upsell ? "Save changes" : "Create upsell"}</>
            }
          </button>
        </>
      }
    >
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Field label="Title" required>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Extra landing page" />
      </Field>

      <Field label="Description">
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </Field>

      <div className="f2">
        <Field label={`Amount (${currency})`} required>
          <input type="number" min="0" step="0.01" value={form.amountPkr} onChange={(e) => set("amountPkr", e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Billing mode" required>
          <select value={form.billingMode} onChange={(e) => set("billingMode", e.target.value as "one_time" | "recurring")}>
            <option value="one_time">One-time</option>
            <option value="recurring">Recurring</option>
          </select>
        </Field>
      </div>

      <Field label="Earned by (partner)" required>
        <select value={form.earnerAccountId} onChange={(e) => set("earnerAccountId", e.target.value)}>
          <option value="">Select partner</option>
          {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>

      <Field label="Commission rate (%)" required>
        <input type="number" min="0" max="100" step="0.1" value={form.commissionRatePct} onChange={(e) => set("commissionRatePct", e.target.value)} />
      </Field>
      {!upsell && (
        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: -10, marginBottom: 4 }}>
          Defaults from Settings — editable per upsell.
        </div>
      )}

      <Field label="Managed by (optional)">
        <select value={form.managingPartnerId} onChange={(e) => set("managingPartnerId", e.target.value)}>
          <option value="">No managing partner</option>
          {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>

      {form.managingPartnerId && (
        <Field label="Managing commission rate (%)">
          <input type="number" min="0" max="100" step="0.1" value={form.managingCommissionRatePct} onChange={(e) => set("managingCommissionRatePct", e.target.value)} />
        </Field>
      )}

      {amount > 0 && (
        <div style={{ background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rm)", padding: "10px 14px", marginTop: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            Commission preview (on payment)
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--green)" }}>
            <span>Upsell commission ({rate}%)</span>
            <span style={{ fontWeight: 600 }}>{currency} {commissionPreview.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          {form.managingPartnerId && managingRate > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--green)" }}>
              <span>Managing commission ({managingRate}%)</span>
              <span style={{ fontWeight: 600 }}>{currency} {managingCommissionPreview.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
