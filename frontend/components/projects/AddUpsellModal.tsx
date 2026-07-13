"use client";

import { useState } from "react";
import Modal from "@frontend/components/ui/Modal";
import { useAccounts } from "@frontend/hooks/useAccounts";
import { createUpsellRequest } from "@frontend/hooks/useUpsells";
import type { CreateUpsellInput } from "@frontend/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: () => void;
}

const DEFAULT_PERIOD = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export default function AddUpsellModal({ open, onClose, projectId, onCreated }: Props) {
  const { data: accounts } = useAccounts("stakeholder");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateUpsellInput>({
    source: "addon",
    incrementPkr: 0,
    ratePct: 10,
    period: DEFAULT_PERIOD(),
    earnerAccountId: "",
    description: "",
  });

  function set<K extends keyof CreateUpsellInput>(k: K, v: CreateUpsellInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.earnerAccountId) { setError("Please select an earner account"); return; }
    if (form.incrementPkr <= 0) { setError("Amount must be greater than 0"); return; }
    setSaving(true);
    setError(null);
    try {
      await createUpsellRequest(projectId, {
        ...form,
        description: form.description || undefined,
      });
      onCreated();
      onClose();
      setForm({ source: "addon", incrementPkr: 0, ratePct: 10, period: DEFAULT_PERIOD(), earnerAccountId: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create upsell");
    } finally {
      setSaving(false);
    }
  }

  const commissionPreview =
    form.incrementPkr > 0 && form.ratePct > 0
      ? ((form.incrementPkr * form.ratePct) / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 })
      : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Upsell"
      width="narrow"
      footer={
        <>
          <button className="btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit as any} disabled={saving}>
            {saving ? <i className="ti ti-loader-2" style={{ fontSize: 13 }} /> : "Save upsell"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Source */}
        <div>
          <label className="form-label">Type</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {(["addon", "value_increase"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("source", s)}
                className={form.source === s ? "btn-primary" : "btn-outline"}
                style={{ flex: 1, height: 32, fontSize: 12 }}
              >
                {s === "addon" ? "Add-on service" : "Value increase"}
              </button>
            ))}
          </div>
        </div>

        {/* Earner account */}
        <div>
          <label className="form-label">Earner account</label>
          <select
            className="form-select"
            value={form.earnerAccountId}
            onChange={(e) => set("earnerAccountId", e.target.value)}
            required
          >
            <option value="">Select stakeholder…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="form-label">Upsell amount (PKR)</label>
          <input
            className="form-input"
            type="number"
            min={1}
            step={1}
            placeholder="e.g. 50000"
            value={form.incrementPkr || ""}
            onChange={(e) => set("incrementPkr", Number(e.target.value))}
            required
          />
        </div>

        {/* Rate */}
        <div>
          <label className="form-label">Commission rate (%)</label>
          <input
            className="form-input"
            type="number"
            min={0}
            max={100}
            step={0.5}
            placeholder="e.g. 10"
            value={form.ratePct}
            onChange={(e) => set("ratePct", Number(e.target.value))}
            required
          />
          {commissionPreview && (
            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 4 }}>
              Commission: PKR {commissionPreview}
            </div>
          )}
        </div>

        {/* Period */}
        <div>
          <label className="form-label">Period (YYYY-MM)</label>
          <input
            className="form-input"
            type="month"
            value={form.period}
            onChange={(e) => set("period", e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="form-label">Description <span style={{ color: "var(--t3)", fontSize: 10 }}>(optional)</span></label>
          <textarea
            className="form-input"
            rows={2}
            placeholder="Brief note about this upsell…"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "var(--red)", padding: "6px 10px", background: "var(--red-bg, #fff0f0)", borderRadius: 6 }}>
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
