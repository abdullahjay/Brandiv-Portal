"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Badge from "@frontend/components/ui/Badge";
import { payPayrollRequest } from "@frontend/hooks/usePayroll";
import type { PayrollRecord } from "@frontend/types";

interface PayrollDetailProps {
  record: PayrollRecord | null;
  loading: boolean;
  onPaid: () => void;
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

function fmtPeriod(p: string) {
  const [y, m] = p.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function downloadPayslip(record: PayrollRecord) {
  const name = record.employee?.name ?? record.user?.name ?? "Employee";
  const designation = record.employee?.designation ?? record.user?.role ?? "";
  const department = record.employee?.department ?? "";
  const period = fmtPeriod(record.period);
  const gross = (record.grossPkr / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const deductions = (record.deductions / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const net = (record.netPkr / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const paidAt = record.paidAt ? new Date(record.paidAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "—";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip — ${name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; color: #111; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a56db; padding-bottom: 16px; margin-bottom: 20px; }
  .company { font-size: 20px; font-weight: 700; color: #1a56db; }
  .title { font-size: 13px; color: #666; margin-top: 2px; }
  .badge { background: #e1effe; color: #1a56db; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .field p { margin: 2px 0 0; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; }
  td:last-child { text-align: right; font-weight: 600; }
  .total-row td { font-size: 15px; font-weight: 700; color: #1a56db; border-top: 2px solid #1a56db; border-bottom: none; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
</style></head><body>
<div class="header">
  <div><div class="company">Brandiv Labs</div><div class="title">PAYSLIP</div></div>
  <div class="badge">${period}</div>
</div>
<div class="section">
  <div class="section-title">Employee Details</div>
  <div class="grid">
    <div class="field"><label>Name</label><p>${name}</p></div>
    ${designation ? `<div class="field"><label>Designation</label><p>${designation}</p></div>` : ""}
    ${department ? `<div class="field"><label>Department</label><p>${department}</p></div>` : ""}
    <div class="field"><label>Payment Date</label><p>${paidAt}</p></div>
  </div>
</div>
<div class="section">
  <div class="section-title">Earnings &amp; Deductions</div>
  <table>
    <tr><td>Gross Salary</td><td>PKR ${gross}</td></tr>
    ${record.deductions > 0 ? `<tr><td>Deductions</td><td style="color:#dc2626">− PKR ${deductions}</td></tr>` : ""}
    <tr class="total-row"><td>Net Payable</td><td>PKR ${net}</td></tr>
  </table>
</div>
${record.notes ? `<div class="section"><div class="section-title">Notes</div><p>${record.notes}</p></div>` : ""}
<div class="footer">Computer-generated payslip · ID: ${record.id.slice(0, 8).toUpperCase()}</div>
<script>window.onload = () => { window.print(); }</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

function getRecipientName(record: PayrollRecord): string {
  return record.user?.name ?? record.employee?.name ?? "Unknown";
}

export default function PayrollDetail({ record, loading, onPaid }: PayrollDetailProps) {
  const { data: session } = useSession();
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canPay = ["super_admin", "admin", "finance"].includes(session?.user?.role ?? "");

  async function handlePay() {
    if (!record) return;
    setActing(true);
    setActionError(null);
    try {
      await payPayrollRequest(record.id);
      onPaid();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(false);
    }
  }

  if (!record && !loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--t2)" }}>
        <i className="ti ti-users" style={{ fontSize: 40, color: "var(--t3)" }} />
        <p style={{ fontSize: 13 }}>Select a payroll record to view details</p>
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

  if (!record) return null;

  const grossPkr = record.grossPkr / 100;
  const deductions = record.deductions / 100;
  const netPkr = record.netPkr / 100;
  const name = getRecipientName(record);
  const isEmployee = !!record.employee;

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
              background: isEmployee ? "var(--green-bg)" : "var(--blue-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 600,
              color: isEmployee ? "var(--green)" : "var(--blue)",
              overflow: "hidden",
            }}
          >
            {record.user?.avatarUrl ? (
              <img src={record.user.avatarUrl} alt="" style={{ width: 34, height: 34, objectFit: "cover" }} />
            ) : (
              getInitials(name)
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>{name}</span>
              {isEmployee && (
                <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--green-bg)", color: "var(--green)", borderRadius: 4, fontWeight: 600 }}>
                  EMPLOYEE
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--t2)" }}>
              {record.period}
              {record.user && ` · ${record.user.role.replace(/_/g, " ")}`}
              {record.employee?.designation && ` · ${record.employee.designation}`}
            </div>
          </div>
          <Badge status={record.status} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {actionError && <span style={{ fontSize: 11, color: "var(--red)" }}>{actionError}</span>}
          {record.status === "paid" && (
            <button
              className="btn-outline"
              onClick={() => downloadPayslip(record)}
              style={{ display: "flex", alignItems: "center", gap: 5, height: 32 }}
            >
              <i className="ti ti-file-download" style={{ fontSize: 12 }} />
              Payslip
            </button>
          )}
          {record.status === "pending" && canPay && (
            <button
              className="btn-primary"
              onClick={handlePay}
              disabled={acting}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <i className="ti ti-check" style={{ fontSize: 12 }} />
              {acting ? "Processing…" : "Mark as Paid"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Gross Salary</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--t1)" }}>
              PKR {fmt(grossPkr)}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Deductions</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: deductions > 0 ? "var(--red)" : "var(--t3)" }}>
              {deductions > 0 ? `− PKR ${fmt(deductions)}` : "None"}
            </div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: 11, color: "var(--t2)", marginBottom: 5 }}>Net Payable</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--green)" }}>
              PKR {fmt(netPkr)}
            </div>
          </div>
        </div>

        {/* Payroll breakdown */}
        <Section title="Salary breakdown">
          <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid var(--b3)", paddingBottom: 5 }}>
              <span>Gross salary</span>
              <span style={{ color: "var(--t1)" }}>PKR {fmt(grossPkr)}</span>
            </div>
            {deductions > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid var(--b3)", paddingTop: 5, paddingBottom: 5 }}>
                <span>Deductions</span>
                <span style={{ color: "var(--red)" }}>− PKR {fmt(deductions)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
              <span style={{ fontWeight: 600, color: "var(--t1)", fontSize: 13 }}>Net payable</span>
              <span style={{ fontWeight: 700, color: "var(--green)", fontSize: 14 }}>PKR {fmt(netPkr)}</span>
            </div>
          </div>
        </Section>

        {/* Recipient details */}
        <Section title="Details">
          {record.employee ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InfoItem label="Employee" value={<span style={{ color: "var(--blue)" }}>{record.employee.name}</span>} />
              <InfoItem label="Designation" value={record.employee.designation} />
              <InfoItem label="Department" value={record.employee.department} />
              <InfoItem label="Period" value={record.period} />
              <InfoItem label="Status" value={<Badge status={record.status} />} />
              <InfoItem label="Paid on" value={fmtDate(record.paidAt)} />
              <InfoItem label="Created" value={fmtDate(record.createdAt)} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InfoItem label="User" value={<span style={{ color: "var(--blue)" }}>{record.user?.name}</span>} />
              <InfoItem label="Email" value={record.user?.email} />
              <InfoItem label="Role" value={record.user?.role.replace(/_/g, " ")} />
              <InfoItem label="Period" value={record.period} />
              <InfoItem label="Status" value={<Badge status={record.status} />} />
              <InfoItem label="Paid on" value={fmtDate(record.paidAt)} />
              <InfoItem label="Created" value={fmtDate(record.createdAt)} />
            </div>
          )}
        </Section>

        {record.notes && (
          <Section title="Notes">
            <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>{record.notes}</p>
          </Section>
        )}
      </div>
    </div>
  );
}
