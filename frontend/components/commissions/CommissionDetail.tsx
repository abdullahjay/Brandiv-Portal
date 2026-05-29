"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Badge from "@frontend/components/ui/Badge";
import { approveCommissionRequest } from "@frontend/hooks/useCommissions";
import type { Commission } from "@frontend/types";

interface CommissionDetailProps {
  commission: Commission | null;
  loading: boolean;
  onApproved: () => void;
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

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

export default function CommissionDetail({ commission, loading, onApproved }: CommissionDetailProps) {
  const { data: session } = useSession();
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canApprove = ["super_admin", "admin", "finance"].includes(session?.user?.role ?? "");

  async function handleApprove() {
    if (!commission) return;
    setActing(true);
    setActionError(null);
    try {
      await approveCommissionRequest(commission.id);
      onApproved();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActing(false);
    }
  }

  if (!commission && !loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--t2)" }}>
        <i className="ti ti-coin" style={{ fontSize: 40, color: "var(--t3)" }} />
        <p style={{ fontSize: 13 }}>Select a commission to view details</p>
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

  if (!commission) return null;

  const ratePct = Number(commission.ratePct);
  const baseAmt = commission.baseAmountPkr / 100;
  const commAmt = commission.commissionPkr / 100;
  const isFirst = commission.paymentNumber === 1;

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
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--blue-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--blue)",
            }}
          >
            {commission.stakeholderAccount.ownerUser?.avatarUrl ? (
              <img src={commission.stakeholderAccount.ownerUser.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              getInitials(commission.stakeholderAccount.name)
            )}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>
              {commission.stakeholderAccount.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--t2)" }}>
              {commission.client.companyName} · {commission.period}
            </div>
          </div>
          <Badge status={commission.status} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actionError && <span style={{ fontSize: 11, color: "var(--red)" }}>{actionError}</span>}
          {commission.status === "pending" && canApprove && (
            <button
              className="btn-primary"
              onClick={handleApprove}
              disabled={acting}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <i className="ti ti-check" style={{ fontSize: 12 }} />
              {acting ? "Approving…" : "Approve"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Commission</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--t1)" }}>
              PKR {fmt(commAmt)}
            </div>
            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>{ratePct}% of net</div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Base Amount</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--t1)" }}>
              PKR {fmt(baseAmt)}
            </div>
            <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>Net PKR of income</div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Payment</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--t1)" }}>
              #{commission.paymentNumber}
            </div>
            <div style={{ fontSize: 11, color: isFirst ? "var(--orange)" : "var(--t2)", marginTop: 2 }}>
              {isFirst ? "First payment (15%)" : "Recurring (5%)"}
            </div>
          </div>
        </div>

        {/* Commission details */}
        <Section title="Commission details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <InfoItem label="Stakeholder" value={<span style={{ color: "var(--blue)" }}>{commission.stakeholderAccount.name}</span>} />
            <InfoItem label="Owner" value={commission.stakeholderAccount.ownerUser?.name ?? "—"} />
            <InfoItem label="Client" value={commission.client.companyName} />
            <InfoItem label="Project" value={commission.project?.name ?? "—"} />
            <InfoItem label="Invoice" value={commission.invoice?.invoiceNumber ?? "—"} />
            <InfoItem label="Period" value={commission.period} />
            <InfoItem label="Rate" value={`${ratePct}%`} />
            <InfoItem label="Payment #" value={`#${commission.paymentNumber}`} />
            <InfoItem label="Created" value={fmtDate(commission.createdAt)} />
            <InfoItem label="Status" value={<Badge status={commission.status} />} />
          </div>
        </Section>

        {/* Linked income */}
        {commission.incomeRecord && (
          <Section title="Linked income">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InfoItem
                label="Original amount"
                value={`${commission.incomeRecord.originalCurrency} ${fmt(commission.incomeRecord.originalAmount / 100)}`}
              />
              <InfoItem label="Received" value={fmtDate(commission.incomeRecord.receivedAt)} />
            </div>
          </Section>
        )}

        {/* Commission calculation */}
        <Section title="Calculation">
          <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid var(--b3)", paddingBottom: 5 }}>
              <span>Net PKR (base)</span>
              <span style={{ color: "var(--t1)" }}>PKR {fmt(baseAmt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid var(--b3)", paddingTop: 5, paddingBottom: 5 }}>
              <span>Rate ({isFirst ? "first payment" : "recurring"})</span>
              <span style={{ color: "var(--t1)" }}>{ratePct}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
              <span style={{ fontWeight: 600, color: "var(--t1)", fontSize: 13 }}>Commission</span>
              <span style={{ fontWeight: 700, color: "var(--blue)", fontSize: 14 }}>PKR {fmt(commAmt)}</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
