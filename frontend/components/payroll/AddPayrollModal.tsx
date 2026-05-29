"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import { createPayrollRequest } from "@frontend/hooks/usePayroll";
import type { PayrollRecord, ApiResponse, Employee } from "@frontend/types";

interface AddPayrollModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (record: PayrollRecord) => void;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

type PayrollType = "employee" | "user";

interface FormData {
  type: PayrollType;
  userId: string;
  employeeId: string;
  period: string;
  grossPkr: string;
  deductions: string;
  notes: string;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const EMPTY: FormData = {
  type: "employee",
  userId: "",
  employeeId: "",
  period: currentPeriod(),
  grossPkr: "",
  deductions: "0",
  notes: "",
};

const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "14px 0 6px", borderBottom: "0.5px solid var(--b3)", marginBottom: 12 }}>
    {children}
  </div>
);

export default function AddPayrollModal({ open, onClose, onCreated }: AddPayrollModalProps) {
  const [form, setForm] = useState<FormData>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (!open) { setForm({ ...EMPTY }); setError(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((json: ApiResponse<UserOption[]>) => {
        if (json.success) setUsers(json.data ?? []);
      })
      .catch(() => {});
    fetch("/api/employees?pageSize=200")
      .then((r) => r.json())
      .then((json: ApiResponse<{ items: Employee[] }>) => {
        if (json.success) setEmployees(json.data?.items ?? []);
      })
      .catch(() => {});
  }, [open]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const gross = parseFloat(form.grossPkr) || 0;
  const deductions = parseFloat(form.deductions) || 0;
  const netPkr = Math.max(0, gross - deductions);

  const selectedEmployee = form.type === "employee"
    ? employees.find((e) => e.id === form.employeeId)
    : null;

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload =
        form.type === "employee"
          ? { employeeId: form.employeeId, period: form.period, grossPkr: gross, deductions, notes: form.notes || undefined }
          : { userId: form.userId, period: form.period, grossPkr: gross, deductions, notes: form.notes || undefined };

      const record = await createPayrollRequest(payload);
      onCreated(record);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payroll record");
    } finally {
      setSaving(false);
    }
  }

  const hasRecipient = form.type === "employee" ? !!form.employeeId : !!form.userId;
  const canSubmit = !!(hasRecipient && form.period && gross > 0);

  const footer = (
    <>
      <button className="btn-outline" onClick={onClose}>Cancel</button>
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={saving || !canSubmit}
        style={{ opacity: canSubmit ? 1 : 0.5 }}
      >
        {saving
          ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Creating…</>
          : <><i className="ti ti-check" style={{ fontSize: 12 }} /> Create payroll record</>
        }
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Add payroll record" footer={footer}>
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <SectionHead>Recipient</SectionHead>

      {/* Type toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["employee", "user"] as PayrollType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => set("type", t)}
            style={{
              padding: "5px 14px",
              borderRadius: "var(--rm)",
              border: `1px solid ${form.type === t ? "var(--blue)" : "var(--b3)"}`,
              background: form.type === t ? "var(--blue-bg)" : "transparent",
              color: form.type === t ? "var(--blue)" : "var(--t2)",
              fontSize: 12,
              fontWeight: form.type === t ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {t === "employee" ? "Employee" : "System User"}
          </button>
        ))}
      </div>

      <div className="f2">
        {form.type === "employee" ? (
          <Field label="Employee" required>
            <select value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)}>
              <option value="">Select employee</option>
              {employees.filter((e) => e.status === "active").map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.department ? ` — ${e.department}` : ""}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="System user" required>
            <select value={form.userId} onChange={(e) => set("userId", e.target.value)}>
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Period" required>
          <PeriodSelect value={form.period} onChange={(v) => set("period", v)} style={{ width: "100%" }} />
        </Field>
      </div>

      {/* Show employee base salary hint */}
      {selectedEmployee?.baseSalary && (
        <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 14, marginTop: -8 }}>
          Base salary on record: <strong style={{ color: "var(--t2)" }}>
            PKR {(selectedEmployee.baseSalary / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </strong>
          <button
            type="button"
            onClick={() => set("grossPkr", String(selectedEmployee.baseSalary! / 100))}
            style={{ marginLeft: 8, fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Use this
          </button>
        </div>
      )}

      <SectionHead>Amount</SectionHead>

      <div className="f2">
        <Field label="Gross salary (PKR)" required>
          <input
            type="number"
            min="0"
            step="1"
            value={form.grossPkr}
            onChange={(e) => set("grossPkr", e.target.value)}
            placeholder="e.g. 150000"
          />
        </Field>
        <Field label="Deductions (PKR)">
          <input
            type="number"
            min="0"
            step="1"
            value={form.deductions}
            onChange={(e) => set("deductions", e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>

      {gross > 0 && (
        <div style={{ background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rm)", padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, color: "var(--green)" }}>Net payable</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>
            PKR {netPkr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      )}

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Any notes…"
        />
      </Field>
    </Modal>
  );
}
