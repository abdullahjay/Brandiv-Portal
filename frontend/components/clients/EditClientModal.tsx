"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { useClient, updateClientRequest } from "@frontend/hooks/useClients";
import { useAllLookups, lookupOptions } from "@frontend/hooks/useLookups";
import { useAccounts } from "@frontend/hooks/useAccounts";
import { useUsers } from "@frontend/hooks/useUsers";
import type { Client, LookupItem } from "@frontend/types";

interface EditClientModalProps {
  open: boolean;
  clientId: string | null;
  onClose: () => void;
  onUpdated: (client: Client) => void;
}

interface FormData {
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
  commissionRule: "standard" | "custom" | "none";
  commissionPriorPayments: number;
  partnerId: string;
  referredByUserId: string;
  currency: string;
  paymentTerms: string;
  billingAddress: string;
  taxNumber: string;
  contractStatus: "not_sent" | "sent" | "signed";
  ndaRequired: boolean;
  status: "active" | "pending" | "inactive";
  notes: string;
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

function clientToForm(c: Client): FormData {
  return {
    companyName: c.companyName ?? "",
    industry: c.industry ?? "",
    website: c.website ?? "",
    contactName: c.contactName ?? "",
    contactTitle: c.contactTitle ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    country: c.country ?? "",
    city: c.city ?? "",
    timezone: c.timezone ?? "",
    source: c.source ?? "",
    commissionRule: c.commissionRule ?? "standard",
    commissionPriorPayments: c.commissionPriorPayments ?? 0,
    partnerId: c.partnerId ?? c.partner?.id ?? "",
    referredByUserId: c.referredByUserId ?? c.referredBy?.id ?? "",
    currency: c.currency ?? "USD",
    paymentTerms: c.paymentTerms ?? "",
    billingAddress: c.billingAddress ?? "",
    taxNumber: c.taxNumber ?? "",
    contractStatus: c.contractStatus ?? "not_sent",
    ndaRequired: c.ndaRequired ?? false,
    status: c.status ?? "pending",
    notes: c.notes ?? "",
  };
}

export default function EditClientModal({
  open,
  clientId,
  onClose,
  onUpdated,
}: EditClientModalProps) {
  const { data: client, loading: clientLoading } = useClient(open ? clientId : null);
  const { data: lookupMap, loading: lookupsLoading } = useAllLookups();
  const { data: stakeholderAccounts, loading: stakeholdersLoading } = useAccounts("stakeholder");
  const { users, loading: usersLoading } = useUsers(1, 200);

  const [form, setForm] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when client data loads
  useEffect(() => {
    if (client) setForm(clientToForm(client));
  }, [client]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) { setForm(null); setError(null); }
  }, [open]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleSubmit() {
    if (!form || !clientId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateClientRequest(clientId, {
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
        commissionRule: form.commissionRule,
        commissionPriorPayments: form.commissionPriorPayments,
        partnerId: form.partnerId || null,
        referredByUserId: form.referredByUserId || null,
        currency: form.currency,
        paymentTerms: form.paymentTerms || undefined,
        billingAddress: form.billingAddress || undefined,
        taxNumber: form.taxNumber || undefined,
        contractStatus: form.contractStatus,
        ndaRequired: form.ndaRequired,
        status: form.status,
        notes: form.notes || undefined,
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!(form?.companyName?.trim() && form?.contactName?.trim() && form?.email?.trim());

  const footer = (
    <>
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={saving || !canSubmit}
        style={{ opacity: canSubmit ? 1 : 0.5 }}
      >
        {saving ? (
          <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</>
        ) : (
          <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save changes</>
        )}
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit client"
      width="wide"
      footer={footer}
    >
      {(clientLoading || !form) ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, gap: 8, color: "var(--t3)" }}>
          <i className="ti ti-loader-2" style={{ fontSize: 18 }} />
          <span style={{ fontSize: 13 }}>Loading…</span>
        </div>
      ) : (
        <>
          {error && (
            <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Status — prominent at top for quick deactivation */}
          <div style={{ background: "var(--bg2)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "12px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 500 }}>Client status</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["active", "pending", "inactive"] as const).map((s) => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12 }}>
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => set("status", s)}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{
                    color: s === "active" ? "var(--green)" : s === "inactive" ? "var(--red)" : "var(--t1)",
                    fontWeight: form.status === s ? 500 : 400,
                    textTransform: "capitalize",
                  }}>
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <SectionLabel>Company info</SectionLabel>

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

          <SectionLabel>Finance & legal</SectionLabel>

          <div className="f2">
            <Field label="Preferred currency">
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

          <div className="f3">
            <Field label="Tax / VAT number">
              <input
                value={form.taxNumber}
                onChange={(e) => set("taxNumber", e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="Contract status">
              <LookupSelect
                options={lookupOptions(lookupMap, "contract_status")}
                loading={lookupsLoading}
                value={form.contractStatus}
                onChange={(v) => set("contractStatus", v as FormData["contractStatus"])}
                placeholder="Select status"
              />
            </Field>
            <Field label="Commission rule">
              <LookupSelect
                options={lookupOptions(lookupMap, "commission_rule")}
                loading={lookupsLoading}
                value={form.commissionRule}
                onChange={(v) => set("commissionRule", v as FormData["commissionRule"])}
                placeholder="Select rule"
              />
            </Field>
          </div>

          <div className="f2">
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
            <Field label="Referred by">
              <select
                value={form.referredByUserId}
                onChange={(e) => set("referredByUserId", e.target.value)}
                disabled={usersLoading}
              >
                <option value="">{usersLoading ? "Loading…" : "None"}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
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
                  onChange={(e) => set("commissionPriorPayments", Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ maxWidth: 100 }}
                />
                <span style={{ fontSize: 11, color: "var(--t3)" }}>
                  {form.commissionPriorPayments > 0
                    ? "First invoice here will use recurring rate"
                    : "0 = first invoice here uses first-payment rate"}
                </span>
              </div>
            </Field>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 4 }}>
            <input
              type="checkbox"
              id="ndaRequired"
              checked={form.ndaRequired}
              onChange={(e) => set("ndaRequired", e.target.checked)}
              style={{ width: 14, height: 14, cursor: "pointer" }}
            />
            <label
              htmlFor="ndaRequired"
              style={{ fontSize: 13, color: "var(--t1)", cursor: "pointer", margin: 0 }}
            >
              NDA required
            </label>
          </div>

          <Field label="Internal notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Internal notes (not visible to client)…"
            />
          </Field>
        </>
      )}
    </Modal>
  );
}
