"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import { updateAccountRequest } from "@frontend/hooks/useAccounts";
import type { CrmAccount, ApiResponse } from "@frontend/types";

interface EditAccountModalProps {
  open: boolean;
  account: CrmAccount | null;
  onClose: () => void;
  onUpdated: (account: CrmAccount) => void;
}

interface UserOption { id: string; name: string; email: string; role: string; }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="frow">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function EditAccountModal({ open, account, onClose, onUpdated }: EditAccountModalProps) {
  const [name, setName] = useState("");
  const [sharePct, setSharePct] = useState("0");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [isDefaultOperating, setIsDefaultOperating] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !account) return;
    setName(account.name);
    setSharePct(String(account.sharePct));
    setOwnerUserId(account.ownerUserId ?? "");
    setIsDefaultOperating(account.isDefaultOperating);
    setError(null);
  }, [open, account]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((json: ApiResponse<UserOption[]>) => { if (json.success) setUsers(json.data!); })
      .catch(() => {});
  }, [open]);

  async function handleSubmit() {
    if (!account) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAccountRequest(account.id, {
        name: name.trim(),
        ...((account.type === "stakeholder" || account.type === "company_reserve") && { sharePct: parseFloat(sharePct) || 0 }),
        ...(account.type === "stakeholder" && { ownerUserId: ownerUserId || null }),
        ...(account.type === "operating" && { isDefaultOperating }),
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button className="btn-primary" onClick={handleSubmit} disabled={saving || !name.trim()}>
        {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save changes</>}
      </button>
    </>
  );

  if (!account) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit — ${account.name}`} footer={footer}>
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Field label="Account name">
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>

      {account.type === "stakeholder" && (
        <Field label="Owner (user)">
          <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
            <option value="">No linked user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} — {u.role.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
      )}

      {(account.type === "stakeholder" || account.type === "company_reserve") && (
        <Field label="Profit share (%)">
          <input type="number" min="0" max="100" step="0.5" value={sharePct} onChange={(e) => setSharePct(e.target.value)} />
        </Field>
      )}

      {account.type === "operating" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <input
            type="checkbox"
            id="isDefaultEdit"
            checked={isDefaultOperating}
            onChange={(e) => setIsDefaultOperating(e.target.checked)}
            style={{ width: 14, height: 14, cursor: "pointer" }}
          />
          <label htmlFor="isDefaultEdit" style={{ fontSize: 13, color: "var(--t1)", cursor: "pointer", margin: 0 }}>
            Default operating account
          </label>
        </div>
      )}
    </Modal>
  );
}
