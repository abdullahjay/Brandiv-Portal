import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";

const M = AMOUNT_MULTIPLIER; // 100 — all DB monetary values are actual × 100

function getLast6Periods(): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periods;
}

export async function getDashboardData(period: string) {
  const last6 = getLast6Periods();

  const [
    incomeAgg,
    expenseAgg,
    payrollAgg,
    commissionAgg,
    operatingAccount,
    activeClientsCount,
    activeProjectsCount,
    pendingCommissions,
    unpaidInvoices,
    monthlyIncomeRaw,
    recentIncome,
    topClientsRaw,
  ] = await Promise.all([
    prisma.incomeRecord.aggregate({ where: { period }, _sum: { netPkr: true } }),
    prisma.expense.aggregate({ where: { period }, _sum: { amountPkr: true } }),
    prisma.payrollRecord.aggregate({ where: { period, status: "paid" }, _sum: { netPkr: true } }),
    prisma.commission.aggregate({
      where: { period, status: { in: ["approved", "paid"] } },
      _sum: { commissionPkr: true },
    }),
    prisma.crmAccount.findFirst({
      where: { type: "operating", isDefaultOperating: true },
      select: { currentBalancePkr: true },
    }),
    prisma.client.count({ where: { status: "active" } }),
    prisma.project.count({ where: { status: { notIn: ["done", "cancelled"] } } }),
    prisma.commission.aggregate({
      where: { status: "pending" },
      _sum: { commissionPkr: true },
      _count: { id: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["sent", "overdue"] } },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        dueDate: true,
        status: true,
        currency: true,
        client: { select: { companyName: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
    prisma.incomeRecord.groupBy({
      by: ["period"],
      where: { period: { in: last6 } },
      _sum: { netPkr: true },
    }),
    prisma.incomeRecord.findMany({
      select: {
        id: true,
        period: true,
        netPkr: true,
        originalAmount: true,
        originalCurrency: true,
        receivedAt: true,
        client: { select: { companyName: true } },
      },
      orderBy: { receivedAt: "desc" },
      take: 6,
    }),
    prisma.incomeRecord.groupBy({
      by: ["clientId"],
      where: { period: { in: last6 } },
      _sum: { netPkr: true },
      orderBy: { _sum: { netPkr: "desc" } },
      take: 5,
    }),
  ]);

  // All BigInt values from DB are (actual × 100). Divide by M before returning.
  const totalIncomePkr     = Number(incomeAgg._sum.netPkr ?? 0) / M;
  const totalExpensesPkr   = Number(expenseAgg._sum.amountPkr ?? 0) / M;
  const totalPayrollPkr    = Number(payrollAgg._sum.netPkr ?? 0) / M;
  const totalCommissionsPkr = Number(commissionAgg._sum.commissionPkr ?? 0) / M;
  const netProfitPkr = totalIncomePkr - totalExpensesPkr - totalPayrollPkr - totalCommissionsPkr;

  // Monthly income — fill zeros for months with no data
  const incomeMap = new Map(
    monthlyIncomeRaw.map((r) => [r.period, Number(r._sum.netPkr ?? 0) / M])
  );
  const monthlyIncome = last6.map((p) => ({ period: p, incomePkr: incomeMap.get(p) ?? 0 }));

  // Top clients — resolve names
  const topClientIds = topClientsRaw.map((r) => r.clientId);
  const topClientRows = await prisma.client.findMany({
    where: { id: { in: topClientIds } },
    select: { id: true, companyName: true },
  });
  const clientNameMap = new Map(topClientRows.map((c) => [c.id, c.companyName]));
  const topClients = topClientsRaw.map((r) => ({
    clientName: clientNameMap.get(r.clientId) ?? "Unknown",
    incomePkr: Number(r._sum.netPkr ?? 0) / M,
  }));

  return {
    period,
    currentPeriod: {
      incomePkr: totalIncomePkr,
      expensesPkr: totalExpensesPkr,
      payrollPkr: totalPayrollPkr,
      commissionsPkr: totalCommissionsPkr,
      netProfitPkr,
      grossMarginPct: totalIncomePkr > 0 ? (netProfitPkr / totalIncomePkr) * 100 : 0,
    },
    operatingBalancePkr: Number(operatingAccount?.currentBalancePkr ?? 0) / M,
    counts: {
      activeClients: activeClientsCount,
      activeProjects: activeProjectsCount,
      pendingCommissions: pendingCommissions._count.id,
      pendingCommissionsPkr: Number(pendingCommissions._sum.commissionPkr ?? 0) / M,
      unpaidInvoices: unpaidInvoices.length,
    },
    monthlyIncome,
    recentIncome: recentIncome.map((r) => ({
      id: r.id,
      clientName: r.client.companyName,
      netPkr: Number(r.netPkr) / M,
      originalAmount: Number(r.originalAmount) / M,
      originalCurrency: r.originalCurrency,
      receivedAt: r.receivedAt.toISOString(),
      period: r.period,
    })),
    pendingInvoices: unpaidInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.client.companyName,
      totalAmount: Number(inv.totalAmount ?? 0) / M,
      currency: inv.currency,
      dueDate: inv.dueDate?.toISOString() ?? null,
      status: inv.status,
    })),
    topClients,
  };
}
