"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { deleteExpenseRequest } from "@frontend/hooks/useExpenses";
import type { Expense } from "@frontend/types";

interface ExpenseDetailProps {
  expense: Expense | null;
  loading: boolean;
  onDeleted: () => void;
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--t1)" }}>{value ?? "—"}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)", padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ExpenseDetail({ expense, loading, onDeleted }: ExpenseDetailProps) {
  const { data: session } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canDelete = ["super_admin", "admin", "finance"].includes(session?.user?.role ?? "");

  async function handleDelete() {
    if (!expense) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteExpenseRequest(expense.id);
      onDeleted();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!expense && !loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--t2)" }}>
        <i className="ti ti-receipt" style={{ fontSize: 40, color: "var(--t3)" }} />
        <p style={{ fontSize: 13 }}>Select an expense to view details</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--t3)" }}>
        <i className="ti ti-loader-2" style={{ fontSize: 20 }} />
        <span style={{ fontSize: 12 }}>Loading…</span>
      </div>
    );
  }

  if (!expense) return null;

  const hasFx = expense.originalAmount != null && expense.originalCurrency != null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 20px",
          background: "var(--bg1)",
          borderBottom: "0.5px solid var(--b3)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--red-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-receipt" style={{ fontSize: 14, color: "var(--red)" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>{expense.description}</div>
            <div style={{ fontSize: 11, color: "var(--t2)" }}>{expense.category} · {expense.period}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actionError && <span style={{ fontSize: 11, color: "var(--red)" }}>{actionError}</span>}
          {canDelete && (
            confirmDelete ? (
              <>
                <span style={{ fontSize: 11, color: "var(--t2)" }}>Delete this expense?</span>
                <button
                  className="btn-outline"
                  style={{ color: "var(--red)", borderColor: "var(--red)" }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button className="btn-outline" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </>
            ) : (
              <button
                className="btn-outline"
                style={{ color: "var(--red)", borderColor: "var(--red)" }}
                onClick={() => setConfirmDelete(true)}
              >
                <i className="ti ti-trash" style={{ fontSize: 12 }} />
                Delete
              </button>
            )
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Amount</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--red)" }}>
              PKR {fmt(expense.amountPkr / 100)}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Category</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>{expense.category}</div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Date</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>{fmtDate(expense.date)}</div>
            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>{expense.period}</div>
          </div>
        </div>

        {/* Expense details */}
        <Section title="Expense details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InfoItem label="Description" value={expense.description} />
            <InfoItem label="Category" value={expense.category} />
            <InfoItem label="Period" value={expense.period} />
            <InfoItem label="Date" value={fmtDate(expense.date)} />
            <InfoItem label="Project" value={expense.project?.name ?? "—"} />
            <InfoItem label="Amount (PKR)" value={`PKR ${fmt(expense.amountPkr / 100)}`} />
          </div>
        </Section>

        {/* FX breakdown (if foreign currency) */}
        {hasFx && (
          <Section title="Foreign currency">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InfoItem
                label="Original amount"
                value={`${expense.originalCurrency} ${fmt(expense.originalAmount! / 100)}`}
              />
              <InfoItem
                label="Exchange rate"
                value={`1 ${expense.originalCurrency} = PKR ${Number(expense.exchangeRate).toFixed(4)}`}
              />
              <InfoItem label="PKR equivalent" value={`PKR ${fmt(expense.amountPkr / 100)}`} />
            </div>
          </Section>
        )}

        {/* Notes */}
        {expense.notes && (
          <Section title="Notes">
            <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>{expense.notes}</p>
          </Section>
        )}

        {/* Receipt */}
        {expense.receiptUrl && (
          <Section title="Receipt">
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: "var(--blue)", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}
            >
              <i className="ti ti-external-link" style={{ fontSize: 13 }} />
              View receipt
            </a>
          </Section>
        )}
      </div>
    </div>
  );
}
