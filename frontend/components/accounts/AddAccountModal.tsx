"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createAccountRequest } from "@frontend/hooks/useAccounts";
import type { CrmAccount, ApiResponse } from "@frontend/types";

interface AddAccountModalProps {
  open: boolean;
  defaultType?: "operating" | "company_reserve" | "stakeholder";
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

const TYPE_LABELS: Record<string, string> = {
  operating: "Operating account",
  company_reserve: "Company reserve",
  stakeholder: "Stakeholder account",
};

export default function AddAccountModal({ open, defaultType = "stakeholder", onClose, onCreated }: AddAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"operating" | "company_reserve" | "stakeholder">(defaultType);
  const [sharePct, setSharePct] = useState("0");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [isDefaultOperating, setIsDefaultOperating] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setName(""); setSharePct("0"); setOwnerUserId(""); setError(null); setIsDefaultOperating(false); }
    else setType(defaultType);
  }, [open, defaultType]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((json: ApiResponse<UserOption[]>) => { if (json.success) setUsers(json.data!); })
      .catch(() => {});
  }, [open]);

  // Auto-fill name from selected user
  useEffect(() => {
    if (type !== "stakeholder" || !ownerUserId) return;
    const user = users.find((u) => u.id === ownerUserId);
    if (user && !name) setName(user.name);
  }, [ownerUserId, type, users]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const account = await createAccountRequest({
        name: name.trim(),
        type,
        sharePct: (type === "stakeholder" || type === "company_reserve") ? parseFloat(sharePct) || 0 : 0,
        isDefaultOperating: type === "operating" ? isDefaultOperating : false,
        ownerUserId: type === "stakeholder" ? ownerUserId || null : null,
      });
      onCreated(account);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = name.trim().length > 0;

  const footer = (
    <>
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || !canSubmit} style={{ opacity: canSubmit ? 1 : 0.5 }}>
        {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Creating…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Create account</>}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Add account" footer={footer}>
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Field label="Account type" required>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="stakeholder">Stakeholder account</option>
          <option value="operating">Operating account</option>
          <option value="company_reserve">Company reserve</option>
        </select>
      </Field>

      {type === "stakeholder" && (
        <Field label="Owner (user)">
          <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
            <option value="">No linked user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} — {u.role.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Account name" required>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={TYPE_LABELS[type]} autoFocus />
      </Field>

      {(type === "stakeholder" || type === "company_reserve") && (
        <Field label="Profit share (%)">
          <input type="number" min="0" max="100" step="0.5" value={sharePct} onChange={(e) => setSharePct(e.target.value)} placeholder="e.g. 40" />
        </Field>
      )}

      {type === "operating" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefaultOperating}
            onChange={(e) => setIsDefaultOperating(e.target.checked)}
            style={{ width: 14, height: 14, cursor: "pointer" }}
          />
          <label htmlFor="isDefault" style={{ fontSize: 13, color: "var(--t1)", cursor: "pointer", margin: 0 }}>
            Set as default operating account
          </label>
        </div>
      )}
    </Modal>
  );
}
