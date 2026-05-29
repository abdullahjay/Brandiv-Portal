"use client";

import { useState, useEffect, useCallback } from "react";
import Topbar from "@frontend/components/layout/Topbar";
import Link from "next/link";
import PeriodSelect from "@frontend/components/ui/PeriodSelect";

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

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(p: string) {
  const [y, m] = p.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// Values passed in are already in PKR (divided by 100 in the repository)
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

function KpiCard({ icon, label, value, sub, accent, loading }: {
  icon: string; label: string; value: string; sub?: string; accent?: string; loading?: boolean;
}) {
  return (
    <div style={{
      background: "var(--bg1)", border: "0.5px solid var(--b3)", borderRadius: "var(--rl)",
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4,
      borderLeft: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color: accent ?? "var(--t3)" }} />
        <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      {loading ? (
        <><Skeleton h={22} w="70%" /><Skeleton h={11} w="50%" /></>
      ) : (
        <>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)", lineHeight: 1.2 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "var(--t3)" }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

function RevenueChart({ data, current }: { data: MonthlyIncome[]; current: string }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => d.incomePkr), 1);
  const barW = 28, chartH = 80, gap = 10;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg width={totalW} height={chartH + 28} viewBox={`0 0 ${totalW} ${chartH + 28}`} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const x = i * (barW + gap);
        const barH = Math.max(4, (d.incomePkr / maxVal) * chartH);
        const y = chartH - barH;
        const isCurrent = d.period === current;
        const color = isCurrent ? "var(--blue)" : "var(--b3)";
        const labelColor = isCurrent ? "var(--blue)" : "var(--t3)";
        return (
          <g key={d.period}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} />
            {d.incomePkr > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill={labelColor} fontWeight={isCurrent ? 600 : 400}>
                {d.incomePkr >= 1_000_000 ? `${(d.incomePkr / 1_000_000).toFixed(1)}M` : `${Math.round(d.incomePkr / 1_000)}K`}
              </text>
            )}
            <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill={labelColor} fontWeight={isCurrent ? 600 : 400}>
              {periodLabel(d.period)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PLRow({ label, value, color, border, indent }: { label: string; value: number; color?: string; border?: boolean; indent?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "7px 0", borderTop: border ? "0.5px solid var(--b3)" : undefined,
      marginTop: border ? 4 : 0, paddingLeft: indent ? 10 : 0,
    }}>
      <span style={{ fontSize: 12, color: indent ? "var(--t3)" : "var(--t2)" }}>{label}</span>
      <span style={{ fontSize: indent ? 12 : 13, fontWeight: border ? 700 : 600, color: color ?? "var(--t1)" }}>
        {value < 0 ? `−${fmtFull(-value)}` : fmtFull(value)}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?period=${p}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.message ?? "Failed to load dashboard");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const cp = data?.currentPeriod;
  const counts = data?.counts;
  const maxClientIncome = data ? Math.max(...data.topClients.map((c) => c.incomePkr), 1) : 1;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes skPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .dash-section { background: var(--bg1); border: 0.5px solid var(--b3); border-radius: var(--rl); padding: 16px 18px; }
        .dash-section-head { font-size: 10px; font-weight: 600; color: var(--t3); text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 10px; border-bottom: 0.5px solid var(--b3); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
        .income-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 0.5px solid var(--b3); }
        .income-row:last-child { border-bottom: none; }
        .inv-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 0.5px solid var(--b3); }
        .inv-row:last-child { border-bottom: none; }
      `}</style>

      <Topbar
        title="Dashboard"
        actions={
          <PeriodSelect value={period} onChange={(v) => v && setPeriod(v)} />
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 32px" }}>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 16 }}>
          Business overview · {periodLabel(period)}
        </div>

        {error && (
          <div style={{ background: "var(--red-bg)", color: "var(--red)", borderRadius: "var(--rm)", padding: "10px 14px", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Row 1 — KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <KpiCard
            icon="ti-trending-up"
            label="Revenue this month"
            value={cp ? fmt(cp.incomePkr) : "—"}
            sub={cp ? fmtFull(cp.incomePkr) : undefined}
            accent="var(--blue)"
            loading={loading}
          />
          <KpiCard
            icon="ti-chart-pie"
            label="Net profit"
            value={cp ? fmt(cp.netProfitPkr) : "—"}
            sub={cp ? `${cp.grossMarginPct.toFixed(1)}% margin` : undefined}
            accent={!cp ? "var(--green)" : cp.netProfitPkr >= 0 ? "var(--green)" : "var(--red)"}
            loading={loading}
          />
          <KpiCard
            icon="ti-building-bank"
            label="Operating balance"
            value={data ? fmt(data.operatingBalancePkr) : "—"}
            sub={data ? fmtFull(data.operatingBalancePkr) : undefined}
            accent="#7C3AED"
            loading={loading}
          />
          <KpiCard
            icon="ti-file-invoice"
            label="Unpaid invoices"
            value={counts ? String(counts.unpaidInvoices) : "—"}
            sub={counts ? `${counts.pendingCommissions} pending commission${counts.pendingCommissions !== 1 ? "s" : ""}` : undefined}
            accent="#D97706"
            loading={loading}
          />
        </div>

        {/* Row 2 — Revenue chart + P&L breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12, marginBottom: 16 }}>
          {/* Revenue chart */}
          <div className="dash-section">
            <div className="dash-section-head">
              <span>Revenue — last 6 months</span>
              {cp && <span style={{ fontWeight: 700, color: "var(--blue)", fontSize: 11 }}>{fmtFull(cp.incomePkr)} this month</span>}
            </div>
            {loading ? (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 108 }}>
                {[60, 80, 45, 90, 70, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, background: "var(--bg2)", animation: "skPulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : data?.monthlyIncome.length ? (
              <div style={{ overflowX: "auto", paddingBottom: 4 }}>
                <RevenueChart data={data.monthlyIncome} current={period} />
              </div>
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "24px 0", textAlign: "center" }}>No revenue data yet</div>
            )}
          </div>

          {/* P&L breakdown */}
          <div className="dash-section">
            <div className="dash-section-head"><span>P&amp;L — {periodLabel(period)}</span></div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  <div style={{ fontSize: 10, color: "var(--t3)", textAlign: "right", marginTop: 4 }}>
                    {cp.grossMarginPct.toFixed(1)}% net margin
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "20px 0", textAlign: "center" }}>No data for this period</div>
            )}

            {counts && !loading && (
              <div style={{ marginTop: 14, background: "var(--bg2)", borderRadius: "var(--rm)", padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Active clients", value: counts.activeClients, icon: "ti-users", href: "/clients" },
                  { label: "Active projects", value: counts.activeProjects, icon: "ti-briefcase", href: "/projects" },
                  { label: "Pending commissions", value: counts.pendingCommissions, icon: "ti-coin", href: "/commissions" },
                  { label: "Unpaid invoices", value: counts.unpaidInvoices, icon: "ti-file-dollar", href: "/invoices" },
                ].map((s) => (
                  <Link key={s.label} href={s.href} style={{ display: "flex", flexDirection: "column", gap: 2, textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <i className={`ti ${s.icon}`} style={{ fontSize: 11, color: "var(--t3)" }} />
                      <span style={{ fontSize: 10, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>{s.value}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3 — Recent income + Pending invoices */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {/* Recent income */}
          <div className="dash-section">
            <div className="dash-section-head">
              <span>Recent income</span>
              <Link href="/income" style={{ fontSize: 10, color: "var(--blue)", textDecoration: "none" }}>View all →</Link>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} h={36} />)}
              </div>
            ) : data?.recentIncome.length ? (
              data.recentIncome.map((r) => (
                <div key={r.id} className="income-row">
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--blue-bg)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {r.clientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.clientName}</div>
                    <div style={{ fontSize: 11, color: "var(--t3)" }}>{relativeDate(r.receivedAt)} · {r.period}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{fmtFull(r.netPkr)}</div>
                    {r.originalCurrency !== "PKR" && (
                      <div style={{ fontSize: 10, color: "var(--t3)" }}>{r.originalCurrency} {r.originalAmount.toLocaleString()}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "20px 0", textAlign: "center" }}>No income records yet</div>
            )}
          </div>

          {/* Pending invoices */}
          <div className="dash-section">
            <div className="dash-section-head">
              <span>Pending invoices</span>
              <Link href="/invoices" style={{ fontSize: 10, color: "var(--blue)", textDecoration: "none" }}>View all →</Link>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} h={36} />)}
              </div>
            ) : data?.pendingInvoices.length ? (
              data.pendingInvoices.map((inv) => {
                const due = dueDateLabel(inv.dueDate, inv.status);
                return (
                  <div key={inv.id} className="inv-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{inv.invoiceNumber}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: inv.status === "overdue" ? "var(--red-bg)" : "var(--blue-bg)", color: inv.status === "overdue" ? "var(--red)" : "var(--blue)", textTransform: "uppercase" }}>
                          {inv.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--t3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.clientName}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>{fmtCurrency(inv.totalAmount, inv.currency)}</div>
                      <div style={{ fontSize: 10, color: due.color, fontWeight: 500 }}>{due.label}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "var(--t3)", fontSize: 12, padding: "20px 0", textAlign: "center" }}>No pending invoices</div>
            )}
          </div>
        </div>

        {/* Row 4 — Top clients */}
        <div className="dash-section">
          <div className="dash-section-head">
            <span>Top clients — last 6 months</span>
            <Link href="/clients" style={{ fontSize: 10, color: "var(--blue)", textDecoration: "none" }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={20} />)}
            </div>
          ) : data?.topClients.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.topClients.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--blue-bg)", color: "var(--blue)", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ width: 130, fontSize: 12, color: "var(--t1)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {c.clientName}
                  </div>
                  <div style={{ flex: 1, height: 6, background: "var(--bg2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(c.incomePkr / maxClientIncome) * 100}%`, background: "var(--blue)", borderRadius: 4, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ width: 100, fontSize: 12, fontWeight: 700, color: "var(--t1)", textAlign: "right", flexShrink: 0 }}>{fmtFull(c.incomePkr)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--t3)", fontSize: 12, padding: "12px 0", textAlign: "center" }}>No client data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
