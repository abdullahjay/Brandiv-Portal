"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "@frontend/components/ui/Modal";
import {
  useUsers,
  createUserRequest,
  updateUserRequest,
  deactivateUserRequest,
  reactivateUserRequest,
  deleteUserRequest,
} from "@frontend/hooks/useUsers";
import type { TeamUser } from "@frontend/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ["super_admin", "admin", "manager", "staff", "finance"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  finance: "Finance",
};

const ROLE_COLORS: Record<Role, { bg: string; fg: string }> = {
  super_admin: { bg: "#F5F3FF", fg: "#7C3AED" },
  admin: { bg: "var(--blue-bg)", fg: "var(--blue)" },
  manager: { bg: "#ECFDF5", fg: "#059669" },
  staff: { bg: "var(--bg2)", fg: "var(--t2)" },
  finance: { bg: "#FFFBEB", fg: "#92400E" },
};

function roleBadge(role: string) {
  const c = ROLE_COLORS[role as Role] ?? { bg: "var(--bg2)", fg: "var(--t2)" };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 3,
        background: c.bg,
        color: c.fg,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {ROLE_LABELS[role as Role] ?? role}
    </span>
  );
}

function avatarInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = [
    { bg: "#EFF6FF", fg: "#3B82F6" },
    { bg: "#F0FDF4", fg: "#16A34A" },
    { bg: "#F5F3FF", fg: "#7C3AED" },
    { bg: "#FFFBEB", fg: "#92400E" },
    { bg: "#FFF1F2", fg: "#BE123C" },
    { bg: "#ECFEFF", fg: "#0891B2" },
  ];
  const c = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: c.bg,
        color: c.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.33,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {avatarInitials(name)}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="frow">
      <label>{label}{required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (u: TeamUser) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!open) { setName(""); setEmail(""); setPassword(""); setRole("staff"); setError(null); }
  }, [open]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const user = await createUserRequest({ name: name.trim(), email: email.trim(), password, role });
      onCreated(user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = name.trim() && email.trim() && password.length >= 8;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add team member"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !canSubmit}>
            {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Creating…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Create user</>}
          </button>
        </>
      }
    >
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <Field label="Full name" required>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Abdullah Shah" />
      </Field>
      <Field label="Email address" required>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" />
      </Field>
      <Field label="Password" required>
        <div style={{ position: "relative" }}>
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            style={{ paddingRight: 32 }}
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 0 }}
          >
            <i className={`ti ${showPw ? "ti-eye-off" : "ti-eye"}`} style={{ fontSize: 14 }} />
          </button>
        </div>
      </Field>
      <Field label="Role">
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </Field>
    </Modal>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({ open, user, isAdmin, onClose, onUpdated }: {
  open: boolean;
  user: TeamUser | null;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: (u: TeamUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRole(user.role as Role);
    setError(null);
  }, [open, user]);

  async function handleSubmit() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = { name: name.trim(), email: email.trim() };
      if (password) payload.password = password;
      if (isAdmin) payload.role = role;
      const updated = await updateUserRequest(user.id, payload);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit — ${user.name}`}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !name.trim() || !email.trim()}>
            {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Save changes</>}
          </button>
        </>
      }
    >
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}
      <Field label="Full name" required>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Email address" required>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="New password">
        <div style={{ position: "relative" }}>
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep current"
            style={{ paddingRight: 32 }}
          />
          <button
            type="button"
            onClick={() => setShowPw((p) => !p)}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t3)", padding: 0 }}
          >
            <i className={`ti ${showPw ? "ti-eye-off" : "ti-eye"}`} style={{ fontSize: 14 }} />
          </button>
        </div>
      </Field>
      {isAdmin && (
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </Field>
      )}
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { data: session } = useSession();
  const sessionRole = (session?.user as { role?: string })?.role ?? "";
  const sessionId = (session?.user as { id?: string })?.id ?? "";
  const isAdmin = ["super_admin", "admin"].includes(sessionRole);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { users, total, loading, error, refresh } = useUsers(1, 50, debouncedSearch, filterRole, filterStatus);

  const [selected, setSelected] = useState<TeamUser | null>(null);

  // Auto-select first record when list loads and nothing is selected
  useEffect(() => {
    if (!loading && !selected && users.length > 0) {
      setSelected(users[0]);
    }
  }, [loading, users, selected]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDeactivate() {
    if (!selected) return;
    setDeactivating(true);
    setActionError(null);
    try {
      await deactivateUserRequest(selected.id);
      refresh();
      setSelected((prev) => prev ? { ...prev, status: "inactive" } : null);
      setDeactivateConfirm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeactivating(false);
    }
  }

  async function handleReactivate() {
    if (!selected) return;
    setDeactivating(true);
    setActionError(null);
    try {
      await reactivateUserRequest(selected.id);
      refresh();
      setSelected((prev) => prev ? { ...prev, status: "active" } : null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeactivating(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteUserRequest(selected.id);
      refresh();
      setSelected(null);
      setDeleteConfirm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(false);
    }
  }

  const activeCount = users.filter((u) => u.status === "active").length;
  const inactiveCount = users.filter((u) => u.status === "inactive").length;

  return (
    <>
      <style>{`
        .user-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 0.5px solid var(--b3); transition: background 0.1s; }
        .user-item:last-child { border-bottom: none; }
        .user-item:hover { background: var(--bg2); }
        .user-item.selected { background: var(--blue-bg); border-left: 2px solid var(--blue); padding-left: 12px; }
        .metric-pill { display: flex; flex-direction: column; gap: 2px; background: var(--bg2); border-radius: var(--rm); padding: 10px 14px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>Users</div>
          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{total} team member{total !== 1 ? "s" : ""} · {activeCount} active</div>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setAddOpen(true)}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add user
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 160px)" }}>
        {/* Left panel — user list */}
        <div style={{ width: 300, flexShrink: 0, background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Search + filters */}
          <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--b3)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--t3)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                style={{ paddingLeft: 28, width: "100%", fontSize: 12 }}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ flex: 1, fontSize: 11 }}>
                <option value="">All roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ flex: 1, fontSize: 11 }}>
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: "0.5px solid var(--b3)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg2)", animation: "skPulse 1.4s ease-in-out infinite" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                      <div style={{ height: 11, width: "70%", background: "var(--bg2)", borderRadius: 3, animation: "skPulse 1.4s ease-in-out infinite" }} />
                      <div style={{ height: 9, width: "50%", background: "var(--bg2)", borderRadius: 3, animation: "skPulse 1.4s ease-in-out infinite" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div style={{ padding: 16, fontSize: 12, color: "var(--red)" }}>{error}</div>
            ) : users.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--t3)", fontSize: 12 }}>
                <i className="ti ti-users" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                No users found
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className={`user-item${selected?.id === u.id ? " selected" : ""}`}
                  onClick={() => { setSelected(u); setDeactivateConfirm(false); setActionError(null); }}
                >
                  <div style={{ position: "relative" }}>
                    <Avatar name={u.name} size={36} />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: u.status === "active" ? "var(--green)" : "var(--t3)",
                        border: "1.5px solid var(--bg1)",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      {roleBadge(u.role)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer stats */}
          <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--b3)", display: "flex", gap: 8 }}>
            <div className="metric-pill" style={{ flex: 1 }}>
              <span style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>{activeCount}</span>
            </div>
            <div className="metric-pill" style={{ flex: 1 }}>
              <span style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Inactive</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--t3)" }}>{inactiveCount}</span>
            </div>
          </div>
        </div>

        {/* Right panel — user detail */}
        <div style={{ flex: 1, background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "var(--t3)" }}>
              <i className="ti ti-user-circle" style={{ fontSize: 40 }} />
              <span style={{ fontSize: 13 }}>Select a user to view details</span>
              {isAdmin && (
                <button className="btn-outline" style={{ fontSize: 12 }} onClick={() => setAddOpen(true)}>
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add team member
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div style={{ padding: "20px 24px", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 16 }}>
                <Avatar name={selected.name} size={52} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{selected.email}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    {roleBadge(selected.role)}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: selected.status === "active" ? "#ECFDF5" : "var(--bg2)",
                        color: selected.status === "active" ? "#059669" : "var(--t3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {selected.status}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-outline" onClick={() => { setEditOpen(true); setActionError(null); setDeleteConfirm(false); }}>
                      <i className="ti ti-pencil" style={{ fontSize: 12 }} /> Edit
                    </button>
                    {selected.id !== sessionId && (
                      <>
                        {selected.status === "active" ? (
                          <button
                            className="btn-outline"
                            style={{ color: "var(--red)", borderColor: "var(--red)" }}
                            onClick={() => { setDeactivateConfirm(true); setDeleteConfirm(false); }}
                          >
                            <i className="ti ti-user-off" style={{ fontSize: 12 }} /> Deactivate
                          </button>
                        ) : (
                          <button
                            className="btn-outline"
                            style={{ color: "var(--green)", borderColor: "var(--green)" }}
                            onClick={handleReactivate}
                            disabled={deactivating}
                          >
                            <i className="ti ti-user-check" style={{ fontSize: 12 }} /> Reactivate
                          </button>
                        )}
                        <button
                          className="btn-outline"
                          style={{ color: "var(--red)", borderColor: "var(--red)" }}
                          onClick={() => { setDeleteConfirm(true); setDeactivateConfirm(false); }}
                        >
                          <i className="ti ti-trash" style={{ fontSize: 12 }} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Detail body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {actionError && (
                  <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
                    {actionError}
                  </div>
                )}

                {deactivateConfirm && (
                  <div style={{ background: "var(--red-bg)", border: "0.5px solid var(--red)", borderRadius: "var(--rm)", padding: "12px 14px", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--red)", fontWeight: 600, marginBottom: 8 }}>
                      Deactivate {selected.name}?
                    </div>
                    <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 12 }}>
                      They will lose access to the CRM immediately. You can reactivate them later.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-outline" style={{ fontSize: 11 }} onClick={() => setDeactivateConfirm(false)}>Cancel</button>
                      <button
                        className="btn-primary"
                        style={{ fontSize: 11, background: "var(--red)", borderColor: "var(--red)" }}
                        onClick={handleDeactivate}
                        disabled={deactivating}
                      >
                        {deactivating ? "Deactivating…" : "Yes, deactivate"}
                      </button>
                    </div>
                  </div>
                )}

                {deleteConfirm && (
                  <div style={{ background: "var(--red-bg)", border: "1px solid var(--red)", borderRadius: "var(--rm)", padding: "12px 14px", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: "var(--red)" }} />
                      <div style={{ fontSize: 12, color: "var(--red)", fontWeight: 700 }}>Permanently delete {selected.name}?</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 12 }}>
                      This will permanently remove the user and cannot be undone.
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-outline" style={{ fontSize: 11 }} onClick={() => setDeleteConfirm(false)}>Cancel</button>
                      <button
                        className="btn-primary"
                        style={{ fontSize: 11, background: "var(--red)", borderColor: "var(--red)" }}
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? "Deleting…" : "Yes, delete permanently"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Full name", value: selected.name, icon: "ti-user" },
                    { label: "Email address", value: selected.email, icon: "ti-mail" },
                    { label: "Role", value: ROLE_LABELS[selected.role as Role] ?? selected.role, icon: "ti-shield" },
                    { label: "Status", value: selected.status === "active" ? "Active" : "Inactive", icon: "ti-circle-check" },
                    {
                      label: "Last login",
                      value: selected.lastLogin ? new Date(selected.lastLogin).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never",
                      icon: "ti-clock",
                    },
                    {
                      label: "Member since",
                      value: new Date(selected.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                      icon: "ti-calendar",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{ background: "var(--bg2)", borderRadius: "var(--rm)", padding: "12px 14px" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                        <i className={`ti ${item.icon}`} style={{ fontSize: 11, color: "var(--t3)" }} />
                        <span style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Role permissions info */}
                <div style={{ background: "var(--blue-bg)", border: "0.5px solid #85B7EB", borderRadius: "var(--rm)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Role permissions — {ROLE_LABELS[selected.role as Role] ?? selected.role}
                  </div>
                  {selected.role === "super_admin" || selected.role === "admin" ? (
                    <div style={{ fontSize: 12, color: "var(--t1)" }}>Full access to all modules</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {getModulesForRole(selected.role).map((mod) => (
                        <span
                          key={mod}
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 3,
                            background: "var(--bg1)",
                            color: "var(--t2)",
                            border: "0.5px solid var(--b3)",
                            textTransform: "capitalize",
                          }}
                        >
                          {mod.replace("-", " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(u) => { refresh(); setSelected(u); }}
      />
      <EditUserModal
        open={editOpen}
        user={selected}
        isAdmin={isAdmin}
        onClose={() => setEditOpen(false)}
        onUpdated={(u) => { setSelected(u); refresh(); }}
      />

      <style>{`@keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </>
  );
}

function getModulesForRole(role: string): string[] {
  const map: Record<string, string[]> = {
    manager: ["dashboard", "clients", "projects", "pipeline", "income", "invoices", "transactions", "expenses", "time-tracking", "commissions", "users", "reports"],
    staff: ["dashboard", "clients", "projects", "pipeline", "time-tracking"],
    finance: ["dashboard", "income", "invoices", "transactions", "expenses", "payroll", "accounts", "reports", "settings"],
  };
  return map[role] ?? [];
}
