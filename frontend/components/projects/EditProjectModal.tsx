"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { useProject, updateProjectRequest } from "@frontend/hooks/useProjects";
import { useAllLookups, lookupOptions } from "@frontend/hooks/useLookups";
import AddUpsellModal from "@frontend/components/projects/AddUpsellModal";
import type { Project, CrmAccount, ApiResponse } from "@frontend/types";

interface EditProjectModalProps {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
  onUpdated: (project: Project) => void;
}

interface FormData {
  name: string;
  type: "one_time" | "recurring" | "milestone";
  status: "active" | "pending" | "done" | "cancelled";
  currency: string;
  valueOriginal: string;
  progressPct: string;
  startDate: string;
  deadline: string;
  description: string;
  managingPartnerId: string;
  commissionExempt: boolean;
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

function projectToForm(p: Project): FormData {
  return {
    name: p.name ?? "",
    type: p.type ?? "one_time",
    status: p.status ?? "pending",
    currency: p.currency ?? "USD",
    valueOriginal: p.valueOriginal != null ? String(p.valueOriginal / 100) : "",
    progressPct: String(p.progressPct ?? 0),
    startDate: p.startDate ? p.startDate.slice(0, 10) : "",
    deadline: p.deadline ? p.deadline.slice(0, 10) : "",
    description: p.description ?? "",
    managingPartnerId: p.managingPartnerId ?? "",
    commissionExempt: p.commissionExempt ?? false,
  };
}

const STATUS_OPTIONS: { value: FormData["status"]; label: string; color: string }[] = [
  { value: "pending",   label: "Pending",   color: "var(--t2)" },
  { value: "active",    label: "Active",    color: "var(--green)" },
  { value: "done",      label: "Done",      color: "var(--blue)" },
  { value: "cancelled", label: "Cancelled", color: "var(--red)" },
];

export default function EditProjectModal({
  open,
  projectId,
  onClose,
  onUpdated,
}: EditProjectModalProps) {
  const { data: project, loading: projectLoading } = useProject(open ? projectId : null);
  const { data: lookupMap, loading: lookupsLoading } = useAllLookups();

  const [form, setForm] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stakeholders, setStakeholders] = useState<CrmAccount[]>([]);
  const [showValueChoice, setShowValueChoice] = useState(false);
  const [pendingDelta, setPendingDelta] = useState(0);
  const [upsellModalOpen, setUpsellModalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/accounts?type=stakeholder")
      .then((r) => r.json())
      .then((json: ApiResponse<CrmAccount[]>) => { if (json.success) setStakeholders(json.data!); })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (project) setForm(projectToForm(project));
  }, [project]);

  useEffect(() => {
    if (!open) { setForm(null); setError(null); setShowValueChoice(false); setUpsellModalOpen(false); }
  }, [open]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function doSave(valueOriginalOverride?: number) {
    if (!form || !projectId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProjectRequest(projectId, {
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        currency: form.currency,
        valueOriginal: valueOriginalOverride !== undefined
          ? valueOriginalOverride
          : (form.valueOriginal ? parseFloat(form.valueOriginal) : 0),
        progressPct: parseInt(form.progressPct, 10) || 0,
        startDate: form.startDate || undefined,
        deadline: form.deadline || undefined,
        description: form.description || undefined,
        commissionExempt: form.commissionExempt,
        managingPartnerId: form.managingPartnerId || null,
      });
      onUpdated(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!form || !project) return;
    const newValue = form.valueOriginal ? parseFloat(form.valueOriginal) : 0;
    const oldValue = project.valueOriginal / 100;
    if (newValue > oldValue) {
      setPendingDelta(newValue - oldValue);
      setShowValueChoice(true);
      return;
    }
    try {
      await doSave();
      onClose();
    } catch {
      // error already set by doSave
    }
  }

  // "Treat as normal correction" — save the new value as-is; backend logs a
  // value_correction history entry automatically.
  async function handleValueCorrection() {
    setShowValueChoice(false);
    try {
      await doSave();
      onClose();
    } catch {
      // error already set by doSave
    }
  }

  // "Create upsell from delta" — persist other field edits without touching
  // the value, then let upsell creation own the value bump + history entry.
  async function handleCreateUpsellInstead() {
    if (!project) return;
    setShowValueChoice(false);
    try {
      await doSave(project.valueOriginal / 100);
      setUpsellModalOpen(true);
    } catch {
      // error already set by doSave
    }
  }

  function handleUpsellSaved() {
    onUpdated(project!);
    setUpsellModalOpen(false);
    onClose();
  }

  const canSubmit = !!(form?.name?.trim() && form?.currency);
  const projectTypes = lookupOptions(lookupMap, "project_type");
  const currencies = lookupOptions(lookupMap, "currency");

  const footer = showValueChoice ? null : (
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
    <>
    <Modal open={open} onClose={onClose} title="Edit project" footer={footer}>
      {showValueChoice && form && project ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)", marginBottom: 6 }}>
            Project value increased
          </div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 16, lineHeight: 1.5 }}>
            Value is going up by <strong style={{ color: "var(--t1)" }}>{form.currency} {pendingDelta.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>.
            Is this a scope increase to sell as an upsell (commissionable on payment), or just a correction to the recorded value?
          </div>

          {error && (
            <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              className="btn-outline"
              style={{ justifyContent: "flex-start", padding: "10px 14px", height: "auto" }}
              onClick={handleCreateUpsellInstead}
              disabled={saving}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>Create upsell from delta</div>
                <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>
                  Tracks this as a commissionable upsell — assign an earner, invoice it, and pay commission when received.
                </div>
              </div>
            </button>
            <button
              className="btn-outline"
              style={{ justifyContent: "flex-start", padding: "10px 14px", height: "auto" }}
              onClick={handleValueCorrection}
              disabled={saving}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>Treat as normal correction</div>
                <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>
                  Just updates the recorded project value — no upsell or extra commission.
                </div>
              </div>
            </button>
            <button className="btn-outline" onClick={() => setShowValueChoice(false)} disabled={saving}>
              Back to editing
            </button>
          </div>
        </div>
      ) : (projectLoading || !form) ? (
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

          {/* Status pill selector */}
          <div style={{ background: "var(--bg2)", border: "0.5px solid var(--b3)", borderRadius: "var(--rm)", padding: "12px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 500 }}>Status</div>
            <div style={{ display: "flex", gap: 8 }}>
              {STATUS_OPTIONS.map(({ value, label, color }) => (
                <label key={value} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12 }}>
                  <input
                    type="radio"
                    name="projStatus"
                    value={value}
                    checked={form.status === value}
                    onChange={() => set("status", value)}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ color: form.status === value ? color : "var(--t2)", fontWeight: form.status === value ? 500 : 400 }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <Field label="Project name" required>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Brand Identity Redesign"
              autoFocus
            />
          </Field>

          <div className="f2">
            <Field label="Project type">
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value as FormData["type"])}
                disabled={lookupsLoading}
              >
                {projectTypes.length > 0
                  ? projectTypes.map((o) => (
                      <option key={o.id} value={o.value}>{o.label}</option>
                    ))
                  : (
                    <>
                      <option value="one_time">One-time</option>
                      <option value="recurring">Recurring</option>
                      <option value="milestone">Milestone-based</option>
                    </>
                  )}
              </select>
            </Field>
            <Field label="Progress (%)">
              <input
                type="number"
                min="0"
                max="100"
                value={form.progressPct}
                onChange={(e) => set("progressPct", e.target.value)}
              />
            </Field>
          </div>

          <div className="f2">
            <Field label="Project value">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.valueOriginal}
                onChange={(e) => set("valueOriginal", e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Currency" required>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                disabled={lookupsLoading}
              >
                <option value="">Select currency</option>
                {currencies.map((o) => (
                  <option key={o.id} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="f2">
            <Field label="Start date">
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

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Project scope and details…"
            />
          </Field>

          <Field label="Managing partner">
            <select
              value={form.managingPartnerId}
              onChange={(e) => set("managingPartnerId", e.target.value)}
            >
              <option value="">None</option>
              {stakeholders.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: -10, marginBottom: 4 }}>
            The partner responsible for managing this project. A managing commission will be calculated automatically when income is recorded.
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input
              type="checkbox"
              id="commissionExemptEdit"
              checked={form.commissionExempt}
              onChange={(e) => set("commissionExempt", e.target.checked)}
              style={{ width: 14, height: 14, cursor: "pointer" }}
            />
            <label
              htmlFor="commissionExemptEdit"
              style={{ fontSize: 13, color: "var(--t1)", cursor: "pointer", margin: 0 }}
            >
              Commission exempt
            </label>
          </div>
        </>
      )}
    </Modal>

    {projectId && (
      <AddUpsellModal
        open={upsellModalOpen}
        onClose={() => { setUpsellModalOpen(false); onClose(); }}
        projectId={projectId}
        defaultCurrency={project?.currency ?? form?.currency ?? "USD"}
        onSaved={handleUpsellSaved}
        initialAmount={pendingDelta}
        initialTitle="Value increase"
      />
    )}
    </>
  );
}
