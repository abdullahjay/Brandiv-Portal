"use client";

import { useState, useEffect } from "react";
import Modal from "@frontend/components/ui/Modal";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import { createPayrollRequest } from "@frontend/hooks/usePayroll";
import type { PayrollRecord, ApiResponse, Employee, EffectiveCompensation } from "@frontend/types";

interface AddPayrollModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (record: PayrollRecord) => void;
  prefill?: {
    employeeId?: string;
    period?: string;
    grossPkr?: number;
    defaultTaxPkr?: number;
  };
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
  taxPkr: string;
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

function prevPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

const EMPTY: FormData = {
  type: "employee",
  userId: "",
  employeeId: "",
  period: currentPeriod(),
  grossPkr: "",
  taxPkr: "0",
  deductions: "0",
  notes: "",
};

const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--t3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "14px 0 6px", borderBottom: "0.5px solid var(--b3)", marginBottom: 12 }}>
    {children}
  </div>
);

type SourceHint = "compensation" | "carry_forward" | "base_salary" | null;

export default function AddPayrollModal({ open, onClose, onCreated, prefill }: AddPayrollModalProps) {
  const [form, setForm] = useState<FormData>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sourceHint, setSourceHint] = useState<SourceHint>(null);
  const [compLoading, setCompLoading] = useState(false);

  // Reset form and set basic prefill when modal opens/closes
  useEffect(() => {
    if (!open) { setForm({ ...EMPTY }); setError(null); setSourceHint(null); return; }
    setForm({
      ...EMPTY,
      type: "employee",
      employeeId: prefill?.employeeId ?? "",
      period: prefill?.period ?? currentPeriod(),
    });
  }, [open]);

  // Load users + employees lists once when modal opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/users")
      .then((r) => r.json())
      .then((json: ApiResponse<UserOption[]>) => { if (json.success) setUsers(json.data ?? []); })
      .catch(() => {});
    fetch("/api/employees?status=active&pageSize=200")
      .then((r) => r.json())
      .then((json: ApiResponse<{ items: Employee[] }>) => { if (json.success) setEmployees(json.data?.items ?? []); })
      .catch(() => {});
  }, [open]);

  // Auto-fill amounts whenever employee or period changes — compensation → carry-forward → base salary
  useEffect(() => {
    if (!open || !form.employeeId || form.type !== "employee") {
      if (form.type !== "employee") setSourceHint(null);
      return;
    }

    setCompLoading(true);
    setSourceHint(null);

    // 1. Effective compensation for the selected period
    fetch(`/api/compensation/effective?period=${form.period}`)
      .then((r) => r.json())
      .then((json: ApiResponse<EffectiveCompensation[]>) => {
        if (json.success) {
          const comp = (json.data ?? []).find((c) => c.employeeId === form.employeeId);
          if (comp?.baseSalary) {
            setForm((f) => ({
              ...f,
              grossPkr: String(comp.baseSalary! / 100),
              taxPkr: comp.defaultTaxPkr ? String(comp.defaultTaxPkr / 100) : "0",
              deductions: "0",
            }));
            setSourceHint("compensation");
            setCompLoading(false);
            return;
          }
        }

        // 2. Carry forward from previous month's payroll record
        const prev = prevPeriod(form.period);
        fetch(`/api/payroll?period=${prev}&pageSize=200`)
          .then((r) => r.json())
          .then((json: ApiResponse<{ items: PayrollRecord[] }>) => {
            const prevRecord = (json.data?.items ?? []).find((r) => r.employee?.id === form.employeeId);
            if (prevRecord) {
              setForm((f) => ({
                ...f,
                grossPkr: String(prevRecord.grossPkr / 100),
                taxPkr: String(prevRecord.taxPkr / 100),
                deductions: String((prevRecord.deductions ?? 0) / 100),
              }));
              setSourceHint("carry_forward");
              setCompLoading(false);
              return;
            }

            // 3. Fall back to employee's base salary field
            const emp = employees.find((e) => e.id === form.employeeId);
            if (emp?.baseSalary) {
              setForm((f) => ({
                ...f,
                grossPkr: String(emp.baseSalary! / 100),
                taxPkr: emp.defaultTaxPkr ? String(emp.defaultTaxPkr / 100) : "0",
                deductions: "0",
              }));
              setSourceHint("base_salary");
            }
            setCompLoading(false);
          })
          .catch(() => setCompLoading(false));
      })
      .catch(() => setCompLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.employeeId, form.period, form.type, open]);

  function set<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const gross = parseFloat(form.grossPkr) || 0;
  const tax = parseFloat(form.taxPkr) || 0;
  const deductions = parseFloat(form.deductions) || 0;
  const netPkr = Math.max(0, gross - tax - deductions);

  const selectedEmployee = form.type === "employee"
    ? employees.find((e) => e.id === form.employeeId)
    : null;

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload =
        form.type === "employee"
          ? { employeeId: form.employeeId, period: form.period, grossPkr: gross, taxPkr: tax, deductions, notes: form.notes || undefined }
          : { userId: form.userId, period: form.period, grossPkr: gross, taxPkr: tax, deductions, notes: form.notes || undefined };

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

      {/* Source hint banner */}
      {form.employeeId && form.type === "employee" && (
        <div style={{ marginBottom: 14, marginTop: -8, minHeight: 22 }}>
          {compLoading ? (
            <span style={{ fontSize: 11, color: "var(--t3)" }}>
              <i className="ti ti-loader-2" style={{ fontSize: 11, marginRight: 4 }} />
              Looking up compensation…
            </span>
          ) : sourceHint === "compensation" ? (
            <span style={{ fontSize: 11, color: "var(--green)", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-rosette-discount-check" style={{ fontSize: 13 }} />
              Pre-filled from compensation history for this period
            </span>
          ) : sourceHint === "carry_forward" ? (
            <span style={{ fontSize: 11, color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-history" style={{ fontSize: 13 }} />
              Carried forward from last month's payroll record
            </span>
          ) : sourceHint === "base_salary" ? (
            <span style={{ fontSize: 11, color: "var(--t3)", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="ti ti-user" style={{ fontSize: 13 }} />
              Pre-filled from employee base salary — no compensation history found
            </span>
          ) : selectedEmployee && !compLoading ? (
            <span style={{ fontSize: 11, color: "var(--t3)" }}>No compensation or prior record found. Enter amounts manually.</span>
          ) : null}
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
        <Field label="Income tax (PKR)">
          <input
            type="number"
            min="0"
            step="1"
            value={form.taxPkr}
            onChange={(e) => set("taxPkr", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Other deductions (PKR)">
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
        <div style={{ background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rm)", padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tax > 0 || deductions > 0 ? 6 : 0 }}>
            <div style={{ fontSize: 11, color: "var(--green)" }}>Net payable</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>
              PKR {netPkr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          {(tax > 0 || deductions > 0) && (
            <div style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", display: "flex", gap: 12 }}>
              {tax > 0 && <span>Tax: PKR {tax.toLocaleString()}</span>}
              {deductions > 0 && <span>Deductions: PKR {deductions.toLocaleString()}</span>}
            </div>
          )}
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
