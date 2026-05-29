"use client";

import { useState, useEffect } from "react";
import { updateAccountRequest, deleteAccountRequest } from "@frontend/hooks/useAccounts";
import type { CrmAccount, ApiResponse } from "@frontend/types";

function fmt(n: number) {
  return (n / 100).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

interface UserOption { id: string; name: string; email: string; role: string; }

interface StakeholderDetailProps {
  stakeholder: CrmAccount;
  onUpdated: (a: CrmAccount) => void;
  onDeleted: (id: string) => void;
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "var(--bg2)", borderRadius: "var(--rm)", padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: "var(--t3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: color ?? "var(--t1)" }}>{value}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="frow">
      <label>{label}{required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  );
}

export default function StakeholderDetail({ stakeholder, onUpdated, onDeleted }: StakeholderDetailProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(stakeholder.name);
  const [sharePct, setSharePct] = useState(String(stakeholder.sharePct));
  const [ownerUserId, setOwnerUserId] = useState(stakeholder.ownerUserId ?? "");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when stakeholder changes
  useEffect(() => {
    setName(stakeholder.name);
    setSharePct(String(stakeholder.sharePct));
    setOwnerUserId(stakeholder.ownerUserId ?? "");
    setEditing(false);
    setConfirmDelete(false);
    setError(null);
  }, [stakeholder.id]);

  // Fetch users when editing
  useEffect(() => {
    if (!editing) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((json: ApiResponse<UserOption[]>) => { if (json.success) setUsers(json.data!); })
      .catch(() => {});
  }, [editing]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAccountRequest(stakeholder.id, {
        name: name.trim(),
        sharePct: parseFloat(sharePct) || 0,
        ownerUserId: ownerUserId || null,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stakeholder");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccountRequest(stakeholder.id);
      onDeleted(stakeholder.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stakeholder");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--green-bg, #f0fdf4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--green)",
            flexShrink: 0,
          }}>
            {stakeholder.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--t1)" }}>{stakeholder.name}</div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
              Stakeholder · {Number(stakeholder.sharePct)}% profit share
              {stakeholder.ownerUser && ` · ${stakeholder.ownerUser.name}`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!editing && (
            <button className="btn-outline" style={{ height: 30, fontSize: 12 }} onClick={() => setEditing(true)}>
              <i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit
            </button>
          )}
          {!confirmDelete && !editing && (
            <button
              style={{ height: 30, fontSize: 12, padding: "0 12px", background: "var(--red-bg)", border: "0.5px solid var(--red)", borderRadius: "var(--rm)", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => setConfirmDelete(true)}
            >
              <i className="ti ti-trash" style={{ fontSize: 12 }} /> Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{ background: "var(--red-bg)", border: "0.5px solid var(--red)", borderRadius: "var(--rm)", padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--red)", marginBottom: 6 }}>Delete {stakeholder.name}?</div>
          <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 12 }}>
            This cannot be undone. The account cannot be deleted if it has linked commissions or is set as a client partner.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-outline" style={{ height: 28, fontSize: 11 }} onClick={() => setConfirmDelete(false)}>Cancel</button>
            <button
              style={{ height: 28, fontSize: 11, padding: "0 14px", background: "var(--red)", border: "none", borderRadius: "var(--rm)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <><i className="ti ti-loader-2" style={{ fontSize: 11 }} /> Deleting…</> : "Confirm delete"}
            </button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{ background: "var(--bg2)", borderRadius: "var(--rl)", padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)", marginBottom: 12 }}>Edit stakeholder</div>
          <Field label="Name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Profit share (%)">
            <input type="number" min="0" max="100" step="0.5" value={sharePct} onChange={(e) => setSharePct(e.target.value)} />
          </Field>
          <Field label="Linked user">
            <select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
              <option value="">No linked user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} — {u.role.replace("_", " ")}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn-outline" style={{ height: 30, fontSize: 12 }} onClick={() => { setEditing(false); setError(null); }}>Cancel</button>
            <button className="btn-primary" style={{ height: 30, fontSize: 12 }} onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 11 }} /> Saving…</> : <><i className="ti ti-check" style={{ fontSize: 11 }} /> Save</>}
            </button>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <Metric label="Current balance" value={`PKR ${fmt(stakeholder.currentBalancePkr)}`} />
        <Metric label="Lifetime distributed" value={`PKR ${fmt(stakeholder.lifetimeDistPkr)}`} />
        <Metric label="Lifetime commissions" value={`PKR ${fmt(stakeholder.lifetimeCommPkr)}`} color="var(--green)" />
      </div>

      {/* Share info */}
      <div style={{ background: "var(--blue-bg)", border: "0.5px solid #85B7EB", borderRadius: "var(--rm)", padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--blue)" }}>{Number(stakeholder.sharePct)}%</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--blue)" }}>Profit share allocation</div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>
              This stakeholder receives {Number(stakeholder.sharePct)}% of net profit in each distribution run.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
