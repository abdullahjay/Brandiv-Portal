"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Modal from "@frontend/components/ui/Modal";
import {
  useEmployees,
  createEmployeeRequest,
  updateEmployeeRequest,
  deactivateEmployeeRequest,
  reactivateEmployeeRequest,
  deleteEmployeeRequest,
} from "@frontend/hooks/useEmployees";
import type { Employee } from "@frontend/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `PKR ${Math.round(n / 100).toLocaleString()}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const DEPT_COLORS: Record<string, { bg: string; fg: string }> = {
  Engineering:  { bg: "#EFF6FF", fg: "#3B82F6" },
  Design:       { bg: "#F5F3FF", fg: "#7C3AED" },
  Marketing:    { bg: "#FFFBEB", fg: "#92400E" },
  Sales:        { bg: "#F0FDF4", fg: "#16A34A" },
  Finance:      { bg: "#FFF1F2", fg: "#BE123C" },
  Operations:   { bg: "#ECFEFF", fg: "#0891B2" },
  HR:           { bg: "#FDF4FF", fg: "#A21CAF" },
};

function deptColor(dept: string | null) {
  return DEPT_COLORS[dept ?? ""] ?? { bg: "var(--bg2)", fg: "var(--t2)" };
}

function Avatar({ name, dept, size = 38 }: { name: string; dept: string | null; size?: number }) {
  const c = deptColor(dept);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.32, fontWeight: 700, flexShrink: 0 }}>
      {initials(name)}
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

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "12px 0 6px", borderBottom: "0.5px solid var(--b3)", marginBottom: 12 }}>
      {children}
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function EmployeeModal({ open, employee, onClose, onSaved }: {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSaved: (emp: Employee) => void;
}) {
  const isEdit = !!employee;
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (employee) {
      setName(employee.name);
      setDesignation(employee.designation ?? "");
      setDepartment(employee.department ?? "");
      setEmail(employee.email ?? "");
      setPhone(employee.phone ?? "");
      setCnic(employee.cnic ?? "");
      setJoinDate(employee.joinDate ? employee.joinDate.slice(0, 10) : "");
      setBaseSalary(employee.baseSalary != null ? String(Math.round(employee.baseSalary / 100)) : "");
      setNotes(employee.notes ?? "");
    } else {
      setName(""); setDesignation(""); setDepartment(""); setEmail(""); setPhone(""); setCnic(""); setJoinDate(""); setBaseSalary(""); setNotes("");
    }
    setError(null);
  }, [open, employee]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        designation: designation || undefined,
        department: department || undefined,
        email: email || undefined,
        phone: phone || undefined,
        cnic: cnic || undefined,
        joinDate: joinDate || null,
        baseSalary: baseSalary ? parseFloat(baseSalary) : null,
        notes: notes || undefined,
      };
      const emp = isEdit
        ? await updateEmployeeRequest(employee!.id, payload)
        : await createEmployeeRequest(payload);
      onSaved(emp);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${employee?.name}` : "Add employee"}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Saving…</> : <><i className="ti ti-check" style={{ fontSize: 12 }} /> {isEdit ? "Save changes" : "Add employee"}</>}
          </button>
        </>
      }
    >
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <SectionHead>Basic info</SectionHead>
      <Field label="Full name" required>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Ahmed Khan" />
      </Field>
      <div className="f2">
        <Field label="Designation">
          <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Senior Developer" />
        </Field>
        <Field label="Department">
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">— select —</option>
            {Object.keys(DEPT_COLORS).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      </div>

      <SectionHead>Contact</SectionHead>
      <div className="f2">
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ahmed@company.com" />
        </Field>
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 0000000" />
        </Field>
      </div>
      <Field label="CNIC">
        <input value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="00000-0000000-0" style={{ maxWidth: 180 }} />
      </Field>

      <SectionHead>Employment</SectionHead>
      <div className="f2">
        <Field label="Join date">
          <input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
        </Field>
        <Field label="Base salary (PKR/mo)">
          <input type="number" min="0" step="1000" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="e.g. 150000" />
        </Field>
      </div>

      <Field label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes…" rows={2} />
      </Field>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const canManage = ["super_admin", "admin", "manager"].includes(role);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { employees, total, loading, error, refresh } = useEmployees(debouncedSearch, filterStatus);

  const activeCount = employees.filter((e) => e.status === "active").length;

  // Auto-select first record when list loads and nothing is selected
  useEffect(() => {
    if (!loading && !selected && employees.length > 0) {
      setSelected(employees[0]);
    }
  }, [loading, employees, selected]);

  async function handleDeactivate() {
    if (!selected) return;
    setActioning(true);
    setActionError(null);
    try {
      await deactivateEmployeeRequest(selected.id);
      refresh();
      setSelected((prev) => prev ? { ...prev, status: "inactive" } : null);
      setDeactivateConfirm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActioning(false);
    }
  }

  async function handleReactivate() {
    if (!selected) return;
    setActioning(true);
    setActionError(null);
    try {
      await reactivateEmployeeRequest(selected.id);
      refresh();
      setSelected((prev) => prev ? { ...prev, status: "active" } : null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActioning(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteEmployeeRequest(selected.id);
      refresh();
      setSelected(null);
      setDeleteConfirm(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .emp-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 0.5px solid var(--b3); }
        .emp-item:last-child { border-bottom: none; }
        .emp-item:hover { background: var(--bg2); }
        .emp-item.selected { background: var(--blue-bg); border-left: 2px solid var(--blue); padding-left: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .info-cell { background: var(--bg2); border-radius: var(--rm); padding: 10px 12px; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>Employees</div>
          <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{total} total · {activeCount} active</div>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => { setEditTarget(null); setModalOpen(true); }}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add employee
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 160px)" }}>
        {/* Left — employee list */}
        <div style={{ width: 300, flexShrink: 0, background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--b3)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <i className="ti ti-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--t3)" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…" style={{ paddingLeft: 28, width: "100%", fontSize: 12 }} />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: 11 }}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: "0.5px solid var(--b3)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--bg2)", animation: "skPulse 1.4s ease-in-out infinite" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                    <div style={{ height: 11, width: "65%", background: "var(--bg2)", borderRadius: 3, animation: "skPulse 1.4s ease-in-out infinite" }} />
                    <div style={{ height: 9, width: "45%", background: "var(--bg2)", borderRadius: 3, animation: "skPulse 1.4s ease-in-out infinite" }} />
                  </div>
                </div>
              ))
            ) : error ? (
              <div style={{ padding: 16, fontSize: 12, color: "var(--red)" }}>{error}</div>
            ) : employees.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--t3)", fontSize: 12 }}>
                <i className="ti ti-users" style={{ fontSize: 24, display: "block", marginBottom: 8 }} />
                No employees found
              </div>
            ) : (
              employees.map((emp) => (
                <div
                  key={emp.id}
                  className={`emp-item${selected?.id === emp.id ? " selected" : ""}`}
                  onClick={() => { setSelected(emp); setDeactivateConfirm(false); setActionError(null); }}
                >
                  <div style={{ position: "relative" }}>
                    <Avatar name={emp.name} dept={emp.department} size={38} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 9, height: 9, borderRadius: "50%", background: emp.status === "active" ? "var(--green)" : "var(--t3)", border: "1.5px solid var(--bg1)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[emp.designation, emp.department].filter(Boolean).join(" · ") || "No designation"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "8px 14px", borderTop: "0.5px solid var(--b3)", display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: "var(--bg2)", borderRadius: "var(--rm)", padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>{activeCount}</div>
            </div>
            <div style={{ flex: 1, background: "var(--bg2)", borderRadius: "var(--rm)", padding: "8px 10px" }}>
              <div style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>{total}</div>
            </div>
          </div>
        </div>

        {/* Right — employee detail */}
        <div style={{ flex: 1, background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--t3)" }}>
              <i className="ti ti-id-badge" style={{ fontSize: 40 }} />
              <span style={{ fontSize: 13 }}>Select an employee to view details</span>
              {canManage && (
                <button className="btn-outline" style={{ fontSize: 12 }} onClick={() => { setEditTarget(null); setModalOpen(true); }}>
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add first employee
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: "0.5px solid var(--b3)", display: "flex", alignItems: "center", gap: 16 }}>
                <Avatar name={selected.name} dept={selected.department} size={52} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--t1)" }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
                    {[selected.designation, selected.department].filter(Boolean).join(" · ") || "No designation"}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                      background: selected.status === "active" ? "#ECFDF5" : "var(--bg2)",
                      color: selected.status === "active" ? "#059669" : "var(--t3)",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {selected.status}
                    </span>
                    {selected.department && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                        background: deptColor(selected.department).bg,
                        color: deptColor(selected.department).fg,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {selected.department}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-outline" onClick={() => { setEditTarget(selected); setModalOpen(true); setActionError(null); setDeleteConfirm(false); }}>
                      <i className="ti ti-pencil" style={{ fontSize: 12 }} /> Edit
                    </button>
                    {selected.status === "active" ? (
                      <button className="btn-outline" style={{ color: "var(--red)", borderColor: "var(--red)" }} onClick={() => { setDeactivateConfirm(true); setDeleteConfirm(false); }}>
                        <i className="ti ti-user-off" style={{ fontSize: 12 }} /> Deactivate
                      </button>
                    ) : (
                      <button className="btn-outline" style={{ color: "var(--green)", borderColor: "var(--green)" }} onClick={handleReactivate} disabled={actioning}>
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
                  </div>
                )}
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                {actionError && (
                  <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
                    {actionError}
                  </div>
                )}

                {deactivateConfirm && (
                  <div style={{ background: "var(--red-bg)", border: "0.5px solid var(--red)", borderRadius: "var(--rm)", padding: "12px 14px", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--red)", fontWeight: 600, marginBottom: 8 }}>Deactivate {selected.name}?</div>
                    <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 12 }}>This will mark the employee as inactive. You can reactivate them later.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-outline" style={{ fontSize: 11 }} onClick={() => setDeactivateConfirm(false)}>Cancel</button>
                      <button className="btn-primary" style={{ fontSize: 11, background: "var(--red)", borderColor: "var(--red)" }} onClick={handleDeactivate} disabled={actioning}>
                        {actioning ? "Deactivating…" : "Yes, deactivate"}
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
                      This will permanently remove the employee and cannot be undone.
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

                <div className="info-grid">
                  {[
                    { label: "Email", value: selected.email ?? "—", icon: "ti-mail" },
                    { label: "Phone", value: selected.phone ?? "—", icon: "ti-phone" },
                    { label: "CNIC", value: selected.cnic ?? "—", icon: "ti-id" },
                    { label: "Joined", value: fmtDate(selected.joinDate), icon: "ti-calendar" },
                    { label: "Base salary", value: selected.baseSalary != null ? fmt(selected.baseSalary) + "/mo" : "—", icon: "ti-currency-rupee" },
                    { label: "Member since", value: fmtDate(selected.createdAt), icon: "ti-clock" },
                  ].map((item) => (
                    <div key={item.label} className="info-cell">
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                        <i className={`ti ${item.icon}`} style={{ fontSize: 11, color: "var(--t3)" }} />
                        <span style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {selected.notes && (
                  <div style={{ background: "var(--bg2)", borderRadius: "var(--rm)", padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Notes</div>
                    <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>{selected.notes}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <EmployeeModal
        open={modalOpen}
        employee={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={(emp) => {
          refresh();
          setSelected(emp);
        }}
      />
    </>
  );
}
