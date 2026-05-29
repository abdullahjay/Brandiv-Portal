"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { useProject, updateProjectRequest } from "@frontend/hooks/useProjects";
import { useAllLookups, lookupOptions } from "@frontend/hooks/useLookups";
import type { Project } from "@frontend/types";

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

  useEffect(() => {
    if (project) setForm(projectToForm(project));
  }, [project]);

  useEffect(() => {
    if (!open) { setForm(null); setError(null); }
  }, [open]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleSubmit() {
    if (!form || !projectId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProjectRequest(projectId, {
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        currency: form.currency,
        valueOriginal: form.valueOriginal ? parseFloat(form.valueOriginal) : 0,
        progressPct: parseInt(form.progressPct, 10) || 0,
        startDate: form.startDate || undefined,
        deadline: form.deadline || undefined,
        description: form.description || undefined,
        commissionExempt: form.commissionExempt,
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!(form?.name?.trim() && form?.currency);
  const projectTypes = lookupOptions(lookupMap, "project_type");
  const currencies = lookupOptions(lookupMap, "currency");

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
    <Modal open={open} onClose={onClose} title="Edit project" footer={footer}>
      {(projectLoading || !form) ? (
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
  );
}
