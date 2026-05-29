"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Modal from "@frontend/components/ui/Modal";
import Topbar from "@frontend/components/layout/Topbar";
import {
  useSettings,
  useFxRates,
  useLookups,
  saveSettings,
  saveFxRates,
  createLookupRequest,
  updateLookupRequest,
  deleteLookupRequest,
  type AppSettings,
} from "@frontend/hooks/useSettings";
import type { LookupItem } from "@frontend/types";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "14px 0 6px", borderBottom: "0.5px solid var(--b3)", marginBottom: 12 }}>
      {title}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="frow">
      <label style={{ display: "flex", flexDirection: "column" }}>
        {label}
        {hint && <span style={{ fontSize: 10, color: "var(--t3)", fontWeight: 400, marginTop: 1 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const SUPPORTED_CURRENCIES = ["USD", "GBP", "EUR", "AED"] as const;

const LOOKUP_TYPES = [
  { value: "industry", label: "Industry" },
  { value: "country", label: "Country" },
  { value: "currency", label: "Currency" },
  { value: "timezone", label: "Timezone" },
  { value: "payment_terms", label: "Payment Terms" },
  { value: "client_source", label: "Client Source" },
  { value: "service", label: "Service Type" },
  { value: "nda_status", label: "NDA Status" },
] as const;

// ─── Tab: General Settings ────────────────────────────────────────────────────

function GeneralTab({ canEdit, onLogoChange }: { canEdit: boolean; onLogoChange?: () => void }) {
  const { settings, loading, error, refresh } = useSettings();
  const [form, setForm] = useState<AppSettings>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Logo state — managed independently from the main form
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) {
      setForm(settings);
      setLogoUrl((settings.logo_url as string | null) ?? null);
    }
  }, [loading, settings]);

  function set(key: keyof AppSettings, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await saveSettings(form);
      setSaved(true);
      refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    setLogoError(null);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/settings/upload-logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Upload failed");
      setLogoUrl(json.data.logoUrl);
      refresh();
      onLogoChange?.();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoError(null);
    try {
      await saveSettings({ logo_url: null });
      setLogoUrl(null);
      refresh();
      onLogoChange?.();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Failed to remove logo");
    }
  }

  if (loading) return <div style={{ padding: 24, color: "var(--t3)", fontSize: 12 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: "var(--red)", fontSize: 12 }}>{error}</div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <SectionHead title="Branding" />
      <div style={{ marginBottom: 20 }}>
        {/* Logo preview */}
        <div style={{ marginBottom: 12 }}>
          {logoUrl ? (
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "12px 20px", background: "var(--bg2)", minWidth: 160, minHeight: 56 }}>
              <img src={logoUrl} alt="Logo" style={{ maxHeight: 40, maxWidth: 200, objectFit: "contain" }} />
            </div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "0.5px dashed var(--b3)", borderRadius: "var(--rm)", padding: "12px 20px", color: "var(--t3)", fontSize: 12, minWidth: 160, minHeight: 56 }}>
              <i className="ti ti-photo-off" style={{ fontSize: 18 }} />
              No logo — showing company name
            </div>
          )}
        </div>

        {/* Upload controls */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleLogoUpload(file);
            e.target.value = "";
          }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {canEdit && (
            <button
              className="btn-outline"
              style={{ fontSize: 12 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={logoUploading}
            >
              {logoUploading
                ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Uploading…</>
                : <><i className="ti ti-upload" style={{ fontSize: 12 }} /> {logoUrl ? "Replace logo" : "Upload logo"}</>
              }
            </button>
          )}
          {canEdit && logoUrl && (
            <button
              className="btn-outline"
              style={{ fontSize: 12, color: "var(--red)", borderColor: "var(--red)" }}
              onClick={handleRemoveLogo}
            >
              <i className="ti ti-trash" style={{ fontSize: 12 }} /> Remove
            </button>
          )}
        </div>
        {logoError && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>{logoError}</div>}
        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
          PNG, JPG, SVG or WebP · max 2 MB · appears in the sidebar
        </div>
      </div>

      <SectionHead title="Company" />
      <Field label="Company name" hint="Appears on invoices and reports">
        <input value={String(form.company_name ?? "")} onChange={(e) => set("company_name", e.target.value)} placeholder="Brandiv Labs" disabled={!canEdit} />
      </Field>
      <Field label="NTN / Tax number" hint="National Tax Number for invoices">
        <input value={String(form.company_ntn ?? "")} onChange={(e) => set("company_ntn", e.target.value)} placeholder="0000000-0" disabled={!canEdit} />
      </Field>
      <Field label="Billing address" hint="Printed on invoice footer">
        <textarea
          value={String(form.company_address ?? "")}
          onChange={(e) => set("company_address", e.target.value)}
          placeholder="123 Street, Lahore, Pakistan"
          rows={3}
          disabled={!canEdit}
          style={{ resize: "vertical" }}
        />
      </Field>

      <SectionHead title="Invoicing" />
      <Field label="Invoice prefix" hint="Prefix for auto-generated invoice numbers">
        <input value={String(form.invoice_prefix ?? "")} onChange={(e) => set("invoice_prefix", e.target.value)} placeholder="INV-" disabled={!canEdit} style={{ maxWidth: 120 }} />
      </Field>

      <SectionHead title="Default tax rates" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Default WHT %" hint="Withholding tax">
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={String(form.default_wht_pct ?? "")}
            onChange={(e) => set("default_wht_pct", e.target.value)}
            placeholder="6"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Default GST %" hint="General sales tax">
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={String(form.default_gst_pct ?? "")}
            onChange={(e) => set("default_gst_pct", e.target.value)}
            placeholder="0"
            disabled={!canEdit}
          />
        </Field>
      </div>

      <SectionHead title="Commission rates" />
      <div style={{ background: "var(--bg2)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "10px 14px", fontSize: 11, color: "var(--t3)", marginBottom: 14 }}>
        Applied automatically when income is recorded. <strong>First payment</strong> rate applies to payment&nbsp;#1 for a new client; <strong>recurring</strong> applies to all subsequent payments.
        You can override the starting payment count per-client (for clients already in business before being added to the system).
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="First payment rate %" hint={`Default: ${15}% — new client, payment #1`}>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={String(form.commission_rate_first ?? "")}
            onChange={(e) => set("commission_rate_first", e.target.value)}
            placeholder="15"
            disabled={!canEdit}
          />
        </Field>
        <Field label="Recurring rate %" hint={`Default: ${5}% — payment #2 onwards`}>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={String(form.commission_rate_recurring ?? "")}
            onChange={(e) => set("commission_rate_recurring", e.target.value)}
            placeholder="5"
            disabled={!canEdit}
          />
        </Field>
      </div>

      {saveError && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginTop: 16 }}>
          {saveError}
        </div>
      )}

      {canEdit && (
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save settings</>}
          </button>
          {saved && <span style={{ fontSize: 12, color: "var(--green)" }}><i className="ti ti-circle-check" style={{ fontSize: 12 }} /> Saved</span>}
        </div>
      )}
    </div>
  );
}

// ─── Tab: FX Rates ────────────────────────────────────────────────────────────

function FxRatesTab({ canEdit }: { canEdit: boolean }) {
  const { rates, loading, error, refresh } = useFxRates();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm(Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, String(v)])));
    }
  }, [loading, rates]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const numeric = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, parseFloat(v) || 0])
      );
      await saveFxRates(numeric);
      setSaved(true);
      refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 24, color: "var(--t3)", fontSize: 12 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: "var(--red)", fontSize: 12 }}>{error}</div>;

  return (
    <div style={{ maxWidth: 420 }}>
      <SectionHead title="Exchange rates (to PKR)" />
      <div style={{ background: "var(--blue-bg)", border: "0.5px solid #85B7EB", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 11, color: "var(--blue)", marginBottom: 16 }}>
        These rates are used as defaults when recording income. You can override per-record at entry time.
      </div>

      {SUPPORTED_CURRENCIES.map((currency) => (
        <Field key={currency} label={`${currency} → PKR`} hint={`1 ${currency} = ? PKR`}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form[currency] ?? ""}
            onChange={(e) => { setForm((f) => ({ ...f, [currency]: e.target.value })); setSaved(false); }}
            placeholder="e.g. 278.50"
            disabled={!canEdit}
            style={{ maxWidth: 160 }}
          />
        </Field>
      ))}

      {saveError && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginTop: 12 }}>
          {saveError}
        </div>
      )}

      {canEdit && (
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save rates</>}
          </button>
          {saved && <span style={{ fontSize: 12, color: "var(--green)" }}><i className="ti ti-circle-check" style={{ fontSize: 12 }} /> Saved</span>}
        </div>
      )}
    </div>
  );
}

// ─── Add Lookup Modal ─────────────────────────────────────────────────────────

function AddLookupModal({ open, defaultType, onClose, onCreated }: {
  open: boolean;
  defaultType?: string;
  onClose: () => void;
  onCreated: (item: LookupItem) => void;
}) {
  const [type, setType] = useState(defaultType ?? "industry");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setValue(""); setLabel(""); setCode(""); setError(null); }
    else if (defaultType) setType(defaultType);
  }, [open, defaultType]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const item = await createLookupRequest({ type, value: value.trim(), label: label.trim(), code: code.trim() || null });
      onCreated(item);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = value.trim() && label.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add lookup item"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {LOOKUP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="Value" hint="Internal identifier (no spaces)">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. technology" autoFocus />
      </Field>
      <Field label="Label" hint="Displayed in dropdowns">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Technology" />
      </Field>
      <Field label="Code" hint="Optional short code (ISO, etc.)">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. TECH" style={{ maxWidth: 120 }} />
      </Field>
    </Modal>
  );
}

// ─── Tab: Lookup Tables ───────────────────────────────────────────────────────

function LookupsTab({ canEdit }: { canEdit: boolean }) {
  const { lookups, loading, error, refresh } = useLookups();
  const [activeType, setActiveType] = useState("industry");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCode, setEditCode] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const items: LookupItem[] = (lookups[activeType] ?? []);

  function startEdit(item: LookupItem) {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditCode(item.code ?? "");
    setActionError(null);
  }

  async function saveEdit(id: string) {
    setSavingId(id);
    setActionError(null);
    try {
      await updateLookupRequest(id, { label: editLabel.trim(), code: editCode.trim() || null });
      setEditingId(null);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteLookupRequest(id);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleActive(item: LookupItem) {
    try {
      await updateLookupRequest(item.id, { active: !item.active });
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  if (loading) return <div style={{ padding: 24, color: "var(--t3)", fontSize: 12 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: "var(--red)", fontSize: 12 }}>{error}</div>;

  return (
    <div style={{ display: "flex", gap: 16, minHeight: 400 }}>
      {/* Type nav */}
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Categories</div>
        {LOOKUP_TYPES.map((t) => {
          const count = (lookups[t.value] ?? []).length;
          const isActive = activeType === t.value;
          return (
            <div
              key={t.value}
              onClick={() => setActiveType(t.value)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "7px 10px",
                borderRadius: "var(--rm)",
                cursor: "pointer",
                background: isActive ? "var(--blue-bg)" : "transparent",
                color: isActive ? "var(--blue)" : "var(--t2)",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                marginBottom: 2,
              }}
            >
              <span>{t.label}</span>
              {count > 0 && (
                <span style={{ fontSize: 10, background: isActive ? "var(--blue)" : "var(--b3)", color: isActive ? "#fff" : "var(--t3)", borderRadius: 10, padding: "1px 5px", fontWeight: 600 }}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Items table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--t1)" }}>
            {LOOKUP_TYPES.find((t) => t.value === activeType)?.label ?? activeType}
            <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 400, marginLeft: 8 }}>{items.length} items</span>
          </div>
          {canEdit && (
            <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => setAddOpen(true)}>
              <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add item
            </button>
          )}
        </div>

        {actionError && (
          <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "8px 12px", fontSize: 12 }}>
            {actionError}
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--t3)", gap: 8 }}>
            <i className="ti ti-list" style={{ fontSize: 28 }} />
            <span style={{ fontSize: 12 }}>No items yet</span>
            {canEdit && (
              <button className="btn-outline" style={{ fontSize: 12 }} onClick={() => setAddOpen(true)}>
                <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add first item
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "0.5px solid var(--b3)", background: "var(--bg2)" }}>
                  {["Value", "Label", "Code", "Active", ""].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", fontSize: 10, fontWeight: 600, color: "var(--t3)", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "0.5px solid var(--b3)" }} className="trow">
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--t2)", fontFamily: "monospace" }}>{item.value}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>
                      {editingId === item.id ? (
                        <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} style={{ fontSize: 12, padding: "3px 8px" }} autoFocus />
                      ) : (
                        <span style={{ color: "var(--t1)", fontWeight: 500 }}>{item.label}</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>
                      {editingId === item.id ? (
                        <input value={editCode} onChange={(e) => setEditCode(e.target.value)} style={{ fontSize: 12, padding: "3px 8px", maxWidth: 80 }} />
                      ) : (
                        <span style={{ color: "var(--t3)" }}>{item.code ?? "—"}</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {canEdit ? (
                        <input
                          type="checkbox"
                          checked={item.active}
                          onChange={() => handleToggleActive(item)}
                          style={{ cursor: "pointer" }}
                          title={item.active ? "Deactivate" : "Activate"}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: item.active ? "var(--green)" : "var(--t3)" }}>
                          {item.active ? "Yes" : "No"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {canEdit && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {editingId === item.id ? (
                            <>
                              <button
                                className="btn-primary"
                                style={{ fontSize: 11, padding: "3px 10px" }}
                                onClick={() => saveEdit(item.id)}
                                disabled={savingId === item.id}
                              >
                                {savingId === item.id ? "…" : "Save"}
                              </button>
                              <button className="btn-outline" style={{ fontSize: 11, padding: "3px 10px" }} onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn-outline" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => startEdit(item)}>
                                <i className="ti ti-pencil" style={{ fontSize: 11 }} />
                              </button>
                              <button
                                className="btn-outline"
                                style={{ fontSize: 11, padding: "3px 8px", color: "var(--red)", borderColor: "var(--red)" }}
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                              >
                                {deletingId === item.id ? "…" : <i className="ti ti-trash" style={{ fontSize: 11 }} />}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddLookupModal
        open={addOpen}
        defaultType={activeType}
        onClose={() => setAddOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "general", label: "General", icon: "ti-settings" },
  { id: "fx-rates", label: "FX Rates", icon: "ti-currency-dollar" },
  { id: "lookups", label: "Lookup Tables", icon: "ti-list-details" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role ?? "";
  const canEdit = ["super_admin", "admin"].includes(role);
  const canView = ["super_admin", "admin", "finance"].includes(role);

  const [tab, setTab] = useState<TabId>("general");

  if (!canView) {
    return (
      <>
        <Topbar title="Settings" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "var(--t3)" }}>
          <i className="ti ti-lock" style={{ fontSize: 36 }} />
          <span style={{ fontSize: 14 }}>You don&apos;t have permission to access settings</span>
        </div>
      </>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Topbar title="Settings" />

      {/* Tab bar */}
      <div style={{ borderBottom: "0.5px solid var(--b3)", padding: "0 28px", display: "flex", gap: 2, background: "var(--bg1)", flexShrink: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? "var(--blue)" : "var(--t2)",
              background: "none",
              border: "none",
              borderBottom: tab === t.id ? "2px solid var(--blue)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 0.1s",
            }}
          >
            <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 40px" }}>
        {!canEdit && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg2)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "10px 14px", fontSize: 12, color: "var(--t3)", marginBottom: 20 }}>
            <i className="ti ti-eye" style={{ fontSize: 14, flexShrink: 0 }} />
            You have view-only access to settings. Contact an admin to make changes.
          </div>
        )}
        {tab === "general" && <GeneralTab canEdit={canEdit} onLogoChange={() => router.refresh()} />}
        {tab === "fx-rates" && <FxRatesTab canEdit={canEdit} />}
        {tab === "lookups" && <LookupsTab canEdit={canEdit} />}
      </div>
    </div>
  );
}
