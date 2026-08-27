"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import Topbar from "@frontend/components/layout/Topbar";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";
import { dashboardQueryKey, fetchDashboard } from "@frontend/lib/queries/listQueries";
import { currentPeriod, periodLabel } from "@frontend/lib/period";

interface PeriodFinancials {
  incomePkr: number;
  expensesPkr: number;
  payrollPkr: number;
  commissionsPkr: number;
  netProfitPkr: number;
  grossMarginPct: number;
}

interface MonthlyIncome {
  period: string;
  incomePkr: number;
}

interface RecentIncome {
  id: string;
  clientName: string;
  netPkr: number;
  originalAmount: number;
  originalCurrency: string;
  receivedAt: string;
  period: string;
}

interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  currency: string;
  dueDate: string | null;
  status: string;
}

interface TopClient {
  clientName: string;
  incomePkr: number;
}

interface DashboardData {
  period: string;
  currentPeriod: PeriodFinancials;
  operatingBalancePkr: number;
  counts: {
    activeClients: number;
    activeProjects: number;
    pendingCommissions: number;
    pendingCommissionsPkr: number;
    unpaidInvoices: number;
  };
  monthlyIncome: MonthlyIncome[];
  recentIncome: RecentIncome[];
  pendingInvoices: PendingInvoice[];
  topClients: TopClient[];
}

function monthShort(p: string) {
  const [y, m] = p.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function fmt(n: number) {
  if (n >= 1_000_000) return `₨ ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `₨ ${(n / 1_000).toFixed(1)}K`;
  return `₨ ${Math.round(n).toLocaleString()}`;
}

function fmtFull(n: number) {
  return `₨ ${Math.round(n).toLocaleString("en-PK")}`;
}

function fmtCurrency(amount: number, currency: string) {
  if (currency === "PKR") return fmtFull(amount);
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

function relativeDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dueDateLabel(iso: string | null, status: string) {
  if (!iso) return { label: "No due date", color: "var(--t3)" };
  const diff = Math.floor((new Date(iso).getTime() - Date.now()) / 86400000);
  if (status === "overdue" || diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, color: "var(--red)" };
  if (diff === 0) return { label: "Due today", color: "#D97706" };
  if (diff <= 7) return { label: `Due in ${diff}d`, color: "#D97706" };
  return { label: new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "var(--t2)" };
}

function Skeleton({ w = "100%", h = 14 }: { w?: string | number; h?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: 4, background: "var(--bg2)", animation: "skPulse 1.4s ease-in-out infinite" }} />
  );
}

function HeroMetric({ icon, label, value, sub, accent, loading }: {
  icon: string; label: string; value: string; sub?: string; accent: string; loading?: boolean;
}) {
  return (
    <div style={{
      background: "var(--bg1)",
      border: "0.5px solid var(--b3)",
      borderRadius: "var(--rl)",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      minHeight: 108,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${accent}18`, color: accent,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
        </div>
      </div>
      {loading ? (
        <><Skeleton h={26} w="75%" /><Skeleton h={11} w="50%" /></>
      ) : (
        <>
          <div style={{ fontSize: 22, fontWeight: 700, color: accent, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "var(--t3)" }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

function OpsChip({ icon, label, value, href, loading }: {
  icon: string; label: string; value: string | number; href: string; loading?: boolean;
}) {
  return (
    <Link href={href} style={{
      flex: 1, minWidth: 0, textDecoration: "none",
      background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)",
      padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
      transition: "border-color .12s, box-shadow .12s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--b3)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: "var(--bg2)", color: "var(--t2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
        {loading ? <Skeleton h={18} w={40} /> : (
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--t1)", lineHeight: 1 }}>{value}</div>
        )}
      </div>
      <i className="ti ti-chevron-right" style={{ fontSize: 13, color: "var(--t3)", marginLeft: "auto", flexShrink: 0 }} />
    </Link>
  );
}

function RevenueChart({ data, highlight }: { data: MonthlyIncome[]; highlight: string }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.incomePkr), 1);
  const chartH = 120;
  const gap = 8;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, height: chartH + 32, width: "100%" }}>
      {data.map((d) => {
        const barH = Math.max(6, (d.incomePkr / maxVal) * chartH);
        const isHighlight = highlight && d.period === highlight;
        const color = isHighlight ? "var(--blue)" : "var(--b3)";
        return (
          <div key={d.period} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
            {d.incomePkr > 0 && (
              <div style={{ fontSize: 9, color: isHighlight ? "var(--blue)" : "var(--t3)", fontWeight: isHighlight ? 600 : 400, marginBottom: 4, whiteSpace: "nowrap" }}>
                {d.incomePkr >= 1_000_000 ? `${(d.incomePkr / 1_000_000).toFixed(1)}M` : `${Math.round(d.incomePkr / 1_000)}K`}
              </div>
            )}
            <div style={{
              width: "100%", maxWidth: 48, height: barH, borderRadius: 6,
              background: color, transition: "height .4s ease, background .2s",
            }} />
            <div style={{
              fontSize: 10, marginTop: 8, color: isHighlight ? "var(--blue)" : "var(--t3)",
              fontWeight: isHighlight ? 600 : 400, whiteSpace: "nowrap",
            }}>
              {monthShort(d.period)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PLRow({ label, value, color, border, indent }: { label: string; value: number; color?: string; border?: boolean; indent?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderTop: border ? "0.5px solid var(--b3)" : undefined,
      marginTop: border ? 6 : 0, paddingLeft: indent ? 12 : 0,
    }}>
      <span style={{ fontSize: 12, color: indent ? "var(--t3)" : "var(--t2)" }}>{label}</span>
      <span style={{ fontSize: indent ? 12 : 13, fontWeight: border ? 700 : 600, color: color ?? "var(--t1)" }}>
        {value < 0 ? `−${fmtFull(-value)}` : fmtFull(value)}
      </span>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)",
      padding: "16px 18px", display: "flex", flexDirection: "column", minHeight: 0,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingBottom: 12, marginBottom: 4, borderBottom: "0.5px solid var(--b3)",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function ListRow({ avatar, title, meta, value, sub }: {
  avatar?: React.ReactNode; title: string; meta?: string; value: string; sub?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "0.5px solid var(--b3)" }}>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        {meta && <div style={{ fontSize: 11, color: "var(--t3)" }}>{meta}</div>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>{value}</div>
        {sub}
      </div>
    </div>
  );
}

export default function DashboardPageClient() {
  const [period, setPeriod] = useState(currentPeriod());
  const isAll = !period;

  const query = useQuery({
    queryKey: dashboardQueryKey(period),
    queryFn: () => fetchDashboard(period),
    placeholderData: keepPreviousData,
  });

  const data = query.data ?? null;
  const loading = query.isLoading;
  const error = query.error?.message ?? null;

  const cp = data?.currentPeriod;
  const counts = data?.counts;
  const maxClientIncome = data ? Math.max(...data.topClients.map((c) => c.incomePkr), 1) : 1;
  const revenueLabel = isAll ? "Total revenue" : "Revenue";
  const plTitle = isAll ? "P&L (accrual) — all periods" : `P&L (accrual) — ${periodLabel(period)}`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .dash-content { flex: 1; overflow-y: auto; padding: 20px 24px 32px; background: var(--bg3); }
        .dash-hero-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
        .dash-ops-row { display: flex; gap: 10px; margin-bottom: 16px; }
        .dash-main-grid { display: grid; grid-template-columns: 1fr 320px; gap: 12px; margin-bottom: 12px; }
        .dash-lists-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .dash-quick-links { display: flex; gap: 8px; flex-wrap: wrap; }
        .dash-quick-link {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; color: var(--t2); text-decoration: none;
          padding: 5px 10px; border-radius: var(--rm);
          border: 0.5px solid var(--b3); background: var(--bg1);
          transition: border-color .12s, color .12s;
        }
        .dash-quick-link:hover { border-color: var(--blue); color: var(--blue); }
        @media (max-width: 1100px) {
          .dash-hero-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-main-grid { grid-template-columns: 1fr; }
          .dash-lists-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 767px) {
          .dash-content { padding: 12px 14px 24px !important; }
          .dash-hero-grid { grid-template-columns: 1fr 1fr; }
          .dash-ops-row { flex-direction: column; }
          .dash-lists-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <Topbar
        title="Dashboard"
        actions={
          <PeriodSelect value={period} onChange={setPeriod} includeAll allLabel="All periods" />
        }
      />

      <div className="dash-content">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.02em", margin: 0 }}>Overview</h1>
            <p style={{ fontSize: 13, color: "var(--t3)", margin: "4px 0 0" }}>{periodLabel(period)} · accrual basis</p>
          </div>
          <div className="dash-quick-links">
            <Link href="/reports" className="dash-quick-link"><i className="ti ti-chart-bar" style={{ fontSize: 12 }} /> Statements</Link>
            <Link href="/income" className="dash-quick-link"><i className="ti ti-cash" style={{ fontSize: 12 }} /> Income</Link>
            <Link href="/invoices" className="dash-quick-link"><i className="ti ti-file-dollar" style={{ fontSize: 12 }} /> Invoices</Link>
            <Link href="/expenses" className="dash-quick-link"><i className="ti ti-receipt" style={{ fontSize: 12 }} /> Expenses</Link>
          </div>
        </div>

        {error && (
          <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 14px", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Hero metrics */}
        <div className="dash-hero-grid">
          <HeroMetric
            icon="ti-trending-up"
            label={revenueLabel}
            value={cp ? fmt(cp.incomePkr) : "—"}
            sub={cp ? fmtFull(cp.incomePkr) : undefined}
            accent="var(--blue)"
            loading={loading}
          />
          <HeroMetric
            icon="ti-chart-pie"
            label="Net profit"
            value={cp ? fmt(cp.netProfitPkr) : "—"}
            sub={cp ? `${cp.grossMarginPct.toFixed(1)}% margin` : undefined}
            accent={!cp ? "var(--green)" : cp.netProfitPkr >= 0 ? "var(--green)" : "var(--red)"}
            loading={loading}
          />
          <HeroMetric
            icon="ti-building-bank"
            label="Operating balance"
            value={data ? fmt(data.operatingBalancePkr) : "—"}
            sub={data ? fmtFull(data.operatingBalancePkr) : undefined}
            accent="#7C3AED"
            loading={loading}
          />
          <HeroMetric
            icon="ti-alert-circle"
            label="Needs attention"
            value={counts ? String(counts.unpaidInvoices + counts.pendingCommissions) : "—"}
            sub={counts ? `${counts.unpaidInvoices} invoice${counts.unpaidInvoices !== 1 ? "s" : ""} · ${counts.pendingCommissions} commission${counts.pendingCommissions !== 1 ? "s" : ""}` : undefined}
            accent="#D97706"
            loading={loading}
          />
        </div>

        {/* Operations strip */}
        <div className="dash-ops-row">
          <OpsChip icon="ti-users" label="Active clients" value={counts?.activeClients ?? "—"} href="/clients" loading={loading} />
          <OpsChip icon="ti-briefcase" label="Active projects" value={counts?.activeProjects ?? "—"} href="/projects" loading={loading} />
          <OpsChip icon="ti-coin" label="Pending commissions" value={counts?.pendingCommissions ?? "—"} href="/commissions" loading={loading} />
          <OpsChip icon="ti-file-dollar" label="Unpaid invoices" value={counts?.unpaidInvoices ?? "—"} href="/invoices" loading={loading} />
        </div>

        {/* Chart + P&L */}
        <div className="dash-main-grid">
          <Panel
            title="Revenue trend — last 6 months"
            action={cp && !isAll ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--blue)" }}>{fmtFull(cp.incomePkr)} selected</span>
            ) : undefined}
          >
            {loading ? (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 152 }}>
                {[55, 80, 40, 95, 65, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 6, background: "var(--bg2)", animation: "skPulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : data?.monthlyIncome.length ? (
              <RevenueChart data={data.monthlyIncome} highlight={period} />
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "40px 0", textAlign: "center" }}>No revenue data yet</div>
            )}
          </Panel>

          <Panel title={plTitle}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={13} />)}
              </div>
            ) : cp ? (
              <>
                <PLRow label="Revenue" value={cp.incomePkr} color="var(--blue)" />
                <PLRow label="Expenses" value={-cp.expensesPkr} color={cp.expensesPkr > 0 ? "var(--red)" : "var(--t3)"} indent />
                <PLRow label="Payroll" value={-cp.payrollPkr} color={cp.payrollPkr > 0 ? "var(--red)" : "var(--t3)"} indent />
                <PLRow label="Commissions" value={-cp.commissionsPkr} color={cp.commissionsPkr > 0 ? "var(--red)" : "var(--t3)"} indent />
                <PLRow label="Net profit" value={cp.netProfitPkr} color={cp.netProfitPkr >= 0 ? "var(--green)" : "var(--red)"} border />
                {cp.incomePkr > 0 && (
                  <div style={{ fontSize: 10, color: "var(--t3)", textAlign: "right", marginTop: 6 }}>
                    {cp.grossMarginPct.toFixed(1)}% net margin
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "24px 0", textAlign: "center" }}>No data for this period</div>
            )}
          </Panel>
        </div>

        {/* Three-column lists */}
        <div className="dash-lists-grid">
          <Panel
            title="Recent income"
            action={<Link href="/income" style={{ fontSize: 11, color: "var(--blue)", textDecoration: "none" }}>View all →</Link>}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} h={40} />)}
              </div>
            ) : data?.recentIncome.length ? (
              data.recentIncome.map((r, idx, arr) => (
                <div key={r.id} style={{ borderBottom: idx < arr.length - 1 ? undefined : "none" }}>
                  <ListRow
                    avatar={
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--blue-bg)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {r.clientName.slice(0, 2).toUpperCase()}
                      </div>
                    }
                    title={r.clientName}
                    meta={`${relativeDate(r.receivedAt)} · ${r.period}`}
                    value={fmtFull(r.netPkr)}
                    sub={r.originalCurrency !== "PKR" ? (
                      <div style={{ fontSize: 10, color: "var(--t3)" }}>{r.originalCurrency} {r.originalAmount.toLocaleString()}</div>
                    ) : undefined}
                  />
                </div>
              ))
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "24px 0", textAlign: "center" }}>No income records yet</div>
            )}
          </Panel>

          <Panel
            title="Pending invoices"
            action={<Link href="/invoices" style={{ fontSize: 11, color: "var(--blue)", textDecoration: "none" }}>View all →</Link>}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} h={40} />)}
              </div>
            ) : data?.pendingInvoices.length ? (
              data.pendingInvoices.map((inv, idx, arr) => {
                const due = dueDateLabel(inv.dueDate, inv.status);
                return (
                  <div key={inv.id} style={{ borderBottom: idx < arr.length - 1 ? undefined : "none" }}>
                    <ListRow
                      title={inv.invoiceNumber}
                      meta={inv.clientName}
                      value={fmtCurrency(inv.totalAmount, inv.currency)}
                      sub={
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: inv.status === "overdue" ? "var(--red-bg)" : "var(--blue-bg)", color: inv.status === "overdue" ? "var(--red)" : "var(--blue)", textTransform: "uppercase" }}>
                            {inv.status}
                          </span>
                          <span style={{ fontSize: 10, color: due.color }}>{due.label}</span>
                        </div>
                      }
                    />
                  </div>
                );
              })
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "24px 0", textAlign: "center" }}>No pending invoices</div>
            )}
          </Panel>

          <Panel
            title="Top clients — last 6 months"
            action={<Link href="/clients" style={{ fontSize: 11, color: "var(--blue)", textDecoration: "none" }}>View all →</Link>}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={22} />)}
              </div>
            ) : data?.topClients.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
                {data.topClients.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--blue-bg)", color: "var(--blue)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                        {c.clientName}
                      </div>
                      <div style={{ height: 5, background: "var(--bg2)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(c.incomePkr / maxClientIncome) * 100}%`, background: "var(--blue)", borderRadius: 4, transition: "width .4s ease" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)", flexShrink: 0 }}>{fmtFull(c.incomePkr)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "24px 0", textAlign: "center" }}>No client data available</div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
