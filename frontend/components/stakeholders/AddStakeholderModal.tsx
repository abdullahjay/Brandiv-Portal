"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createAccountRequest } from "@frontend/hooks/useAccounts";
import type { CrmAccount, ApiResponse } from "@frontend/types";

interface AddStakeholderModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (account: CrmAccount) => void;
}

interface UserOption { id: string; name: string; email: string; role: string; }

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="frow">
      <label>{label}{required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  );
}

export default function AddStakeholderModal({ open, onClose, onCreated }: AddStakeholderModalProps) {
  const [name, setName] = useState("");
  const [sharePct, setSharePct] = useState("0");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setName(""); setSharePct("0"); setOwnerUserId(""); setError(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((json: ApiResponse<UserOption[]>) => { if (json.success) setUsers(json.data!); })
      .catch(() => {});
  }, [open]);

  // Auto-fill name from selected user
  useEffect(() => {
    if (!ownerUserId) return;
    const user = users.find((u) => u.id === ownerUserId);
    if (user && !name) setName(user.name);
  }, [ownerUserId, users]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const account = await createAccountRequest({
        name: name.trim(),
        type: "stakeholder",
        sharePct: parseFloat(sharePct) || 0,
        ownerUserId: ownerUserId || null,
      });
      onCreated(account);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stakeholder");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = name.trim().length > 0;

  const footer = (
    <>
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || !canSubmit} style={{ opacity: canSubmit ? 1 : 0.5 }}>
        {saving
          ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Creating…</>
          : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Add stakeholder</>
        }
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Add stakeholder" footer={footer}>
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Field label="Linked user (optional)">
        <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
          <option value="">No linked user</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name} — {u.role.replace("_", " ")}</option>
          ))}
        </select>
      </Field>

      <Field label="Stakeholder name" required>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Abdullah Shahid" autoFocus />
      </Field>

      <Field label="Profit share (%)">
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={sharePct}
          onChange={(e) => setSharePct(e.target.value)}
          placeholder="e.g. 50"
        />
      </Field>

      <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
        Total of all stakeholder shares must equal 100% for distribution to work correctly.
      </div>
    </Modal>
  );
}
