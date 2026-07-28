"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@frontend/components/ui/Modal";
import { createExpenseRequest, updateExpenseRequest } from "@frontend/hooks/useExpenses";
import { DEFAULT_FX_RATES } from "@frontend/constants";
import type { Expense, ApiResponse, LookupItem } from "@frontend/types";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (expense: Expense) => void;
  expense?: Expense | null;
  onUpdated?: (expense: Expense) => void;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface ExpenseForm {
  description: string;
  category: string;
  amountPkr: string;
  useFx: boolean;
  originalAmount: string;
  originalCurrency: string;
  exchangeRate: string;
  date: string;
  projectId: string;
  notes: string;
  receiptUrl: string;
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

const today = new Date().toISOString().slice(0, 10);

const EMPTY: ExpenseForm = {
  description: "",
  category: "",
  amountPkr: "",
  useFx: false,
  originalAmount: "",
  originalCurrency: "USD",
  exchangeRate: String(DEFAULT_FX_RATES["USD"] ?? 278.5),
  date: today,
  projectId: "",
  notes: "",
  receiptUrl: "",
};

const CURRENCIES = ["USD", "GBP", "EUR", "AED", "PKR"];

function formFromExpense(expense: Expense | null | undefined): ExpenseForm {
  if (!expense) return { ...EMPTY };
  const hasFx = expense.originalAmount != null && expense.originalCurrency != null;

  return {
    description: expense.description,
    category: expense.category,
    amountPkr: String(expense.amountPkr / 100),
    useFx: hasFx,
    originalAmount: hasFx ? String((expense.originalAmount ?? 0) / 100) : "",
    originalCurrency: expense.originalCurrency ?? "USD",
    exchangeRate: expense.exchangeRate != null ? String(Number(expense.exchangeRate)) : String(DEFAULT_FX_RATES["USD"] ?? 278.5),
    date: expense.date.slice(0, 10),
    projectId: expense.project?.id ?? "",
    notes: expense.notes ?? "",
    receiptUrl: expense.receiptUrl ?? "",
  };
}

export default function AddExpenseModal({ open, onClose, onCreated, expense, onUpdated }: AddExpenseModalProps) {
  const isEditing = !!expense;
  const [form, setForm] = useState<ExpenseForm>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setForm({ ...EMPTY });
      setError(null);
      setReceiptName(null);
      return;
    }

    setForm(formFromExpense(expense));
    setError(null);
    setReceiptName(expense?.receiptUrl ? "Receipt attached" : null);
  }, [open, expense]);

  // Fetch expense categories from lookup API
  useEffect(() => {
    if (!open) return;
    fetch("/api/lookups?type=expense_category")
      .then((r) => r.json())
      .then((json: ApiResponse<LookupItem[]>) => {
        if (json.success) setCategories(json.data ?? []);
      })
      .catch(() => {});
  }, [open]);

  // Fetch projects for optional project linking
  useEffect(() => {
    if (!open) return;
    fetch("/api/projects?pageSize=100")
      .then((r) => r.json())
      .then((json: ApiResponse<{ items: ProjectOption[] }>) => {
        if (json.success) setProjects(json.data!.items);
      })
      .catch(() => {});
  }, [open]);

  // Auto-fill exchange rate when foreign currency changes
  useEffect(() => {
    if (!form.useFx) return;
    const rate = DEFAULT_FX_RATES[form.originalCurrency];
    if (rate && form.originalCurrency !== "PKR") {
      set("exchangeRate", String(rate));
    } else if (form.originalCurrency === "PKR") {
      set("exchangeRate", "1");
    }
  }, [form.originalCurrency, form.useFx]);

  // Compute PKR amount from FX when foreign fields change
  useEffect(() => {
    if (!form.useFx) return;
    const orig = parseFloat(form.originalAmount) || 0;
    const rate = parseFloat(form.exchangeRate) || 0;
    if (orig > 0 && rate > 0) {
      set("amountPkr", String(Math.round(orig * rate)));
    }
  }, [form.originalAmount, form.exchangeRate, form.useFx]);

  function set<K extends keyof ExpenseForm>(field: K, value: ExpenseForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new window.FormData();
      fd.append("receipt", file);
      const res = await fetch("/api/expenses/upload-receipt", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Upload failed");
      set("receiptUrl", json.data.receiptUrl);
      setReceiptName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        description: form.description,
        category: form.category,
        amountPkr: parseFloat(form.amountPkr),
        originalAmount: form.useFx && form.originalAmount ? parseFloat(form.originalAmount) : null,
        originalCurrency: form.useFx ? form.originalCurrency : null,
        exchangeRate: form.useFx && form.exchangeRate ? parseFloat(form.exchangeRate) : null,
        date: form.date,
        projectId: form.projectId || null,
        notes: form.notes || null,
        receiptUrl: form.receiptUrl || null,
      };
      const saved = isEditing
        ? await updateExpenseRequest(expense!.id, payload)
        : await createExpenseRequest(payload);

      if (isEditing) onUpdated?.(saved);
      else onCreated(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditing ? "Failed to update expense" : "Failed to add expense");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = !!(
    form.description &&
    form.category &&
    form.amountPkr &&
    parseFloat(form.amountPkr) > 0 &&
    form.date
  );

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
          ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> {isEditing ? "Saving..." : "Adding..."}</>
          : <><i className="ti ti-check" style={{ fontSize: 12 }} /> {isEditing ? "Save changes" : "Add expense"}</>
        }
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit expense" : "Add expense"} footer={footer}>
      {error && (
        <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 12px", fontSize: 12, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <Field label="Description" required>
        <input
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="e.g. Google Workspace subscription"
        />
      </Field>

      <div className="f2">
        <Field label="Category" required>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Date" required>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
      </div>

      {/* FX toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--t2)" }}>
          <input
            type="checkbox"
            checked={form.useFx}
            onChange={(e) => set("useFx", e.target.checked)}
            style={{ width: 14, height: 14, accentColor: "var(--blue)" }}
          />
          Foreign currency expense (with FX conversion)
        </label>
      </div>

      {form.useFx ? (
        <>
          <div className="f2">
            <Field label="Original amount" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.originalAmount}
                onChange={(e) => set("originalAmount", e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Currency" required>
              <select value={form.originalCurrency} onChange={(e) => set("originalCurrency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="f2">
            <Field label="Exchange rate (PKR)" required>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={form.exchangeRate}
                onChange={(e) => set("exchangeRate", e.target.value)}
                placeholder="e.g. 278.50"
              />
            </Field>
            <Field label="Amount (PKR)" required>
              <input
                type="number"
                min="0"
                step="1"
                value={form.amountPkr}
                onChange={(e) => set("amountPkr", e.target.value)}
                placeholder="Auto-calculated"
              />
            </Field>
          </div>
        </>
      ) : (
        <Field label="Amount (PKR)" required>
          <input
            type="number"
            min="0"
            step="1"
            value={form.amountPkr}
            onChange={(e) => set("amountPkr", e.target.value)}
            placeholder="e.g. 50000"
          />
        </Field>
      )}

      {/* Amount preview */}
      {form.amountPkr && parseFloat(form.amountPkr) > 0 && (
        <div style={{ background: "var(--red-bg)", border: "0.5px solid var(--red)", borderRadius: "var(--rm)", padding: "8px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--red)" }}>Expense amount</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--red)" }}>
            PKR {parseFloat(form.amountPkr).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}

      <div className="f2">
        <Field label="Project (optional)">
          <select value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Any notes…"
        />
      </Field>

      {/* Receipt attachment */}
      <div style={{ marginBottom: 8 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
        {form.receiptUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--green-bg)", border: "0.5px solid var(--green)", borderRadius: "var(--rm)" }}>
            <i className="ti ti-paperclip" style={{ fontSize: 13, color: "var(--green)" }} />
            <a
              href={form.receiptUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: "var(--green)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {receiptName ?? "Receipt attached"}
            </a>
            <button
              type="button"
              onClick={() => { set("receiptUrl", ""); setReceiptName(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--green)", padding: 0, lineHeight: 1 }}
            >
              <i className="ti ti-x" style={{ fontSize: 12 }} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-outline"
            style={{ width: "100%", height: 36, fontSize: 12 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <><i className="ti ti-loader-2" style={{ fontSize: 12 }} /> Uploading…</>
              : <><i className="ti ti-paperclip" style={{ fontSize: 12 }} /> Attach receipt (PNG, JPG, WebP)</>
            }
          </button>
        )}
      </div>
    </Modal>
  );
}
