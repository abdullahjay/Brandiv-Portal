"use client";

import { useState } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createClientRequest } from "@frontend/hooks/useClients";
import { useAllLookups, lookupOptions } from "@frontend/hooks/useLookups";
import { useAccounts } from "@frontend/hooks/useAccounts";
import type { Client, LookupItem } from "@frontend/types";

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
}

type Step = 1 | 2 | 3;

interface FormData {
  // Step 1
  companyName: string;
  industry: string;
  website: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  timezone: string;
  source: string;
  // Step 2
  projectType: string;
  budgetRange: string;
  description: string;
  startDate: string;
  deadline: string;
  accountManagerId: string;
  partnerId: string;
  commissionRule: "standard" | "custom" | "none";
  commissionPriorPayments: number;
  // Step 3
  currency: string;
  paymentTerms: string;
  billingAddress: string;
  taxNumber: string;
  contractStatus: "not_sent" | "sent" | "signed";
  ndaRequired: boolean;
  notes: string;
}

const EMPTY: FormData = {
  companyName: "",
  industry: "",
  website: "",
  contactName: "",
  contactTitle: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  timezone: "",
  source: "",
  projectType: "one_time",
  budgetRange: "",
  description: "",
  startDate: "",
  deadline: "",
  accountManagerId: "",
  partnerId: "",
  commissionRule: "standard",
  commissionPriorPayments: 0,
  currency: "USD",
  paymentTerms: "Net 30",
  billingAddress: "",
  taxNumber: "",
  contractStatus: "not_sent",
  ndaRequired: false,
  notes: "",
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const labels = ["1 · Company info", "2 · Project scope", "3 · Finance & legal"];
  return (
    <div style={{ display: "flex", marginBottom: 20 }}>
      {labels.map((label, i) => {
        const step = (i + 1) as Step;
        const done = step < current;
        const active = step === current;
        return (
          <div
            key={step}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 6px",
              fontSize: 11,
              borderBottom: `2px solid ${done ? "var(--green)" : active ? "var(--blue)" : "var(--b3)"}`,
              color: done ? "var(--green)" : active ? "var(--blue)" : "var(--t3)",
              fontWeight: active ? 500 : 400,
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label">{children}</div>;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

function LookupSelect({
  options,
  loading,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: LookupItem[];
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={loading}>
      <option value="">{loading ? "Loading…" : placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AddClientModal({ open, onClose, onCreated }: AddClientModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: lookupMap, loading: lookupsLoading } = useAllLookups();
  const { data: stakeholderAccounts, loading: stakeholdersLoading } = useAccounts("stakeholder");

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose() {
    setStep(1);
    setForm(EMPTY);
    setError(null);
    onClose();
  }

  function canAdvance(): boolean {
    if (step === 1) return !!(form.companyName.trim() && form.contactName.trim() && form.email.trim());
    return true;
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<Client> & { partnerId?: string | null } = {
        companyName: form.companyName.trim(),
        industry: form.industry || undefined,
        website: form.website || undefined,
        contactName: form.contactName.trim(),
        contactTitle: form.contactTitle || undefined,
        email: form.email.trim().toLowerCase(),
        phone: form.phone || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        timezone: form.timezone || undefined,
        source: form.source || undefined,
        currency: form.currency,
        paymentTerms: form.paymentTerms || undefined,
        billingAddress: form.billingAddress || undefined,
        taxNumber: form.taxNumber || undefined,
        contractStatus: form.contractStatus,
        ndaRequired: form.ndaRequired,
        commissionRule: form.commissionRule,
        commissionPriorPayments: form.commissionPriorPayments,
        partnerId: form.partnerId || null,
        notes: form.notes || undefined,
        status: "active",
      };
      const created = await createClientRequest(payload);
      onCreated(created);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <button className="btn-outline" onClick={handleClose}>
        Cancel
      </button>
      {step > 1 && (
        <button className="btn-outline" onClick={() => setStep((s) => (s - 1) as Step)}>
          <i className="ti ti-arrow-left" style={{ fontSize: 12 }} /> Back
        </button>
      )}
      {step < 3 ? (
        <button
          className="btn-primary"
          onClick={() => { if (canAdvance()) setStep((s) => (s + 1) as Step); }}
          disabled={!canAdvance()}
          style={{ opacity: canAdvance() ? 1 : 0.5 }}
        >
          Next <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
        </button>
      ) : (
        <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</>
          ) : (
            <><i className="ti ti-check" style={{ fontSize: 12 }} /> Add client</>
          )}
        </button>
      )}
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Add new client — Step ${step} of 3`}
      width="wide"
      footer={footer}
    >
      <StepIndicator current={step} />

      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Step 1: Company info ─────────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <div className="f2">
            <Field label="Company name" required>
              <input
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                placeholder="e.g. TechMark Inc."
              />
            </Field>
            <Field label="Industry">
              <LookupSelect
                options={lookupOptions(lookupMap, "industry")}
                loading={lookupsLoading}
                value={form.industry}
                onChange={(v) => set("industry", v)}
                placeholder="Select industry"
              />
            </Field>
          </div>

          <Field label="Company website">
            <input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://"
            />
          </Field>

          <SectionLabel>Primary contact</SectionLabel>

          <div className="f3">
            <Field label="Full name" required>
              <input
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="John Smith"
              />
            </Field>
            <Field label="Job title">
              <input
                value={form.contactTitle}
                onChange={(e) => set("contactTitle", e.target.value)}
                placeholder="e.g. CEO"
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@company.com"
              />
            </Field>
          </div>

          <div className="f2">
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 000 000 0000"
              />
            </Field>
            <Field label="Country">
              <LookupSelect
                options={lookupOptions(lookupMap, "country")}
                loading={lookupsLoading}
                value={form.country}
                onChange={(v) => set("country", v)}
                placeholder="Select country"
              />
            </Field>
          </div>

          <div className="f2">
            <Field label="City">
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="City"
              />
            </Field>
            <Field label="Timezone">
              <LookupSelect
                options={lookupOptions(lookupMap, "timezone")}
                loading={lookupsLoading}
                value={form.timezone}
                onChange={(v) => set("timezone", v)}
                placeholder="Select timezone"
              />
            </Field>
          </div>

          <Field label="How did they find us?">
            <LookupSelect
              options={lookupOptions(lookupMap, "client_source")}
              loading={lookupsLoading}
              value={form.source}
              onChange={(v) => set("source", v)}
              placeholder="Select source"
            />
          </Field>
        </div>
      )}

      {/* ── Step 2: Project scope ─────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <div className="f2">
            <Field label="Project type">
              <LookupSelect
                options={lookupOptions(lookupMap, "project_type")}
                loading={lookupsLoading}
                value={form.projectType}
                onChange={(v) => set("projectType", v)}
                placeholder="Select type"
              />
            </Field>
            <Field label="Budget range">
              <LookupSelect
                options={lookupOptions(lookupMap, "budget_range")}
                loading={lookupsLoading}
                value={form.budgetRange}
                onChange={(v) => set("budgetRange", v)}
                placeholder="Select range"
              />
            </Field>
          </div>

          <Field label="Project brief / description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What does the client need? Specific goals or requirements…"
            />
          </Field>

          <div className="f2">
            <Field label="Expected start date">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label="Deadline">
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </Field>
          </div>

          <div className="f2">
            <Field label="Commission rule">
              <LookupSelect
                options={lookupOptions(lookupMap, "commission_rule")}
                loading={lookupsLoading}
                value={form.commissionRule}
                onChange={(v) => set("commissionRule", v as FormData["commissionRule"])}
                placeholder="Select rule"
              />
            </Field>
            <Field label="Partner / Stakeholder">
              <select
                value={form.partnerId}
                onChange={(e) => set("partnerId", e.target.value)}
                disabled={stakeholdersLoading}
              >
                <option value="">{stakeholdersLoading ? "Loading…" : "None"}</option>
                {stakeholderAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {form.commissionRule !== "none" && (
            <Field label="Prior payments already made">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.commissionPriorPayments}
                  onChange={(e) => setForm((prev) => ({ ...prev, commissionPriorPayments: Math.max(0, parseInt(e.target.value) || 0) }))}
                  style={{ maxWidth: 100 }}
                />
                <span style={{ fontSize: 11, color: "var(--t3)" }}>
                  For existing clients — leave 0 for brand-new clients
                </span>
              </div>
            </Field>
          )}
        </div>
      )}

      {/* ── Step 3: Finance & legal ───────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <SectionLabel>Billing details</SectionLabel>

          <div className="f2">
            <Field label="Preferred currency" required>
              <LookupSelect
                options={lookupOptions(lookupMap, "currency")}
                loading={lookupsLoading}
                value={form.currency}
                onChange={(v) => set("currency", v)}
                placeholder="Select currency"
              />
            </Field>
            <Field label="Payment terms">
              <LookupSelect
                options={lookupOptions(lookupMap, "payment_terms")}
                loading={lookupsLoading}
                value={form.paymentTerms}
                onChange={(v) => set("paymentTerms", v)}
                placeholder="Select terms"
              />
            </Field>
          </div>

          <Field label="Billing address">
            <input
              value={form.billingAddress}
              onChange={(e) => set("billingAddress", e.target.value)}
              placeholder="Full billing address"
            />
          </Field>

          <div className="f2">
            <Field label="Tax / VAT number">
              <input
                value={form.taxNumber}
                onChange={(e) => set("taxNumber", e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="NDA required?">
              <select
                value={form.ndaRequired ? "yes" : "no"}
                onChange={(e) => set("ndaRequired", e.target.value === "yes")}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
          </div>

          <SectionLabel>Legal</SectionLabel>

          <Field label="Contract status">
            <LookupSelect
              options={lookupOptions(lookupMap, "contract_status")}
              loading={lookupsLoading}
              value={form.contractStatus}
              onChange={(v) => set("contractStatus", v as FormData["contractStatus"])}
              placeholder="Select status"
            />
          </Field>

          <Field label="Internal notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Internal notes about this client (not visible to client)…"
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}
