"use client";

import { useState } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createProjectRequest } from "@frontend/hooks/useProjects";
import { useAllLookups, lookupOptions } from "@frontend/hooks/useLookups";
import { useClients } from "@frontend/hooks/useClients";
import type { Project } from "@frontend/types";

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
  defaultClientId?: string;
}

interface FormData {
  name: string;
  clientId: string;
  type: string;
  currency: string;
  valueOriginal: string;
  startDate: string;
  deadline: string;
  managerId: string;
  description: string;
  commissionExempt: boolean;
}

const EMPTY: FormData = {
  name: "",
  clientId: "",
  type: "one_time",
  currency: "USD",
  valueOriginal: "",
  startDate: "",
  deadline: "",
  managerId: "",
  description: "",
  commissionExempt: false,
};

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

export default function AddProjectModal({
  open,
  onClose,
  onCreated,
  defaultClientId,
}: AddProjectModalProps) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, clientId: defaultClientId ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: lookupMap, loading: lookupsLoading } = useAllLookups();
  const { data: clientsData } = useClients({ status: "active" });
  const clients = clientsData?.items ?? [];
  const currencies = lookupOptions(lookupMap, "currency");
  const projectTypes = lookupOptions(lookupMap, "project_type");

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleClose() {
    setForm({ ...EMPTY, clientId: defaultClientId ?? "" });
    setError(null);
    onClose();
  }

  function canSubmit() {
    return !!(form.name.trim() && form.clientId && form.currency);
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const project = await createProjectRequest({
        name: form.name.trim(),
        clientId: form.clientId,
        type: form.type as any,
        currency: form.currency,
        valueOriginal: form.valueOriginal ? parseFloat(form.valueOriginal) : 0,
        startDate: form.startDate || undefined,
        deadline: form.deadline || undefined,
        description: form.description || undefined,
        commissionExempt: form.commissionExempt,
        status: "active",
      });
      onCreated(project);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <button className="btn-outline" onClick={handleClose}>Cancel</button>
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={saving || !canSubmit()}
        style={{ opacity: canSubmit() ? 1 : 0.5 }}
      >
        {saving ? (
          <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</>
        ) : (
          <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save project</>
        )}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={handleClose} title="Add new project" footer={footer}>
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Field label="Project name" required>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Brand Identity Redesign"
          autoFocus
        />
      </Field>

      <div className="f2">
        <Field label="Client" required>
          <select
            value={form.clientId}
            onChange={(e) => set("clientId", e.target.value)}
            disabled={!!defaultClientId}
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </Field>
        <Field label="Project type" required>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
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
          id="commissionExempt"
          checked={form.commissionExempt}
          onChange={(e) => set("commissionExempt", e.target.checked)}
          style={{ width: 14, height: 14, cursor: "pointer" }}
        />
        <label
          htmlFor="commissionExempt"
          style={{ fontSize: 13, color: "var(--t1)", cursor: "pointer", margin: 0 }}
        >
          Commission exempt
        </label>
      </div>
    </Modal>
  );
}
