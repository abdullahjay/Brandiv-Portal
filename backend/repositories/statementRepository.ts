import { prisma } from "@backend/lib/prisma";
import { excludePayrollExpenses } from "@backend/lib/financialFilters";

function periodWhere(period?: string) {
  return period ? { period } : {};
}

// ─── P&L Statement ────────────────────────────────────────────────────────────

export async function getPnLStatement(period?: string) {
  const pf = periodWhere(period);

  const [incomes, expenses, payrolls, commissions, distribution] = await Promise.all([
    prisma.incomeRecord.findMany({
      where: pf,
      include: { client: { select: { id: true, companyName: true } } },
      orderBy: { netPkr: "desc" },
    }),

    prisma.expense.findMany({
      where: excludePayrollExpenses(pf),
      orderBy: { amountPkr: "desc" },
    }),

    prisma.payrollRecord.findMany({
      where: pf,
      include: {
        user: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { netPkr: "desc" },
    }),

    prisma.commission.findMany({
      where: pf,
      include: {
        stakeholderAccount: { select: { id: true, name: true } },
        client: { select: { companyName: true } },
      },
      orderBy: { commissionPkr: "desc" },
    }),

    period
      ? prisma.distribution.findFirst({ where: { period } })
      : Promise.resolve(null),
  ]);

  const totalIncomePkr = incomes.reduce((s, r) => s + Number(r.netPkr), 0);
  const totalExpensesPkr = expenses.reduce((s, r) => s + Number(r.amountPkr), 0);
  const totalPayrollPkr = payrolls.reduce((s, r) => s + Number(r.netPkr), 0);

  const billableCommissions = commissions.filter((c) => c.status !== "pending");
  const totalCommissionPkr = billableCommissions.reduce((s, c) => s + Number(c.commissionPkr), 0);

  const pendingPayrollPkr = payrolls
    .filter((r) => r.status !== "paid")
    .reduce((s, r) => s + Number(r.netPkr), 0);
  const pendingPayrollCount = payrolls.filter((r) => r.status !== "paid").length;

  const netProfitPkr = totalIncomePkr - totalExpensesPkr - totalPayrollPkr - totalCommissionPkr;
  const grossMarginPct = totalIncomePkr > 0 ? (netProfitPkr / totalIncomePkr) * 100 : 0;

  const incomeByClientMap = new Map<string, { clientName: string; amountPkr: number }>();
  for (const r of incomes) {
    const key = r.client.id;
    const existing = incomeByClientMap.get(key);
    if (existing) {
      existing.amountPkr += Number(r.netPkr);
    } else {
      incomeByClientMap.set(key, { clientName: r.client.companyName, amountPkr: Number(r.netPkr) });
    }
  }
  const incomeByClient = Array.from(incomeByClientMap.values()).sort((a, b) => b.amountPkr - a.amountPkr);

  const expByCatMap = new Map<string, number>();
  for (const e of expenses) {
    expByCatMap.set(e.category, (expByCatMap.get(e.category) ?? 0) + Number(e.amountPkr));
  }
  const expenseByCategory = Array.from(expByCatMap.entries())
    .map(([category, amountPkr]) => ({ category, amountPkr }))
    .sort((a, b) => b.amountPkr - a.amountPkr);

  const payrollByEmployee = payrolls.map((r) => ({
    name: r.user?.name ?? r.employee?.name ?? "Employee",
    grossPkr: Number(r.grossPkr),
    deductions: Number(r.deductions),
    netPkr: Number(r.netPkr),
    status: r.status,
  }));

  const commByAccountMap = new Map<string, { name: string; amountPkr: number; statuses: Set<string> }>();
  for (const c of billableCommissions) {
    const key = c.stakeholderAccount.id;
    const existing = commByAccountMap.get(key);
    if (existing) {
      existing.amountPkr += Number(c.commissionPkr);
      existing.statuses.add(c.status);
    } else {
      commByAccountMap.set(key, {
        name: c.stakeholderAccount.name,
        amountPkr: Number(c.commissionPkr),
        statuses: new Set([c.status]),
      });
    }
  }
  const commissionByStakeholder = Array.from(commByAccountMap.values())
    .map(({ name, amountPkr, statuses }) => ({
      name,
      amountPkr,
      status: statuses.has("paid") ? "paid" : statuses.has("approved") ? "approved" : "pending",
    }))
    .sort((a, b) => b.amountPkr - a.amountPkr);

  const totalWhtPkr = incomes.reduce((s, r) => s + Number(r.whtAmountPkr), 0);
  const totalGrossPkr = incomes.reduce((s, r) => s + Number(r.grossPkr), 0);

  return {
    period: period ?? "all",
    totalGrossPkr,
    totalWhtPkr,
    totalIncomePkr,
    totalExpensesPkr,
    totalPayrollPkr,
    totalCommissionPkr,
    netProfitPkr,
    grossMarginPct: Math.round(grossMarginPct * 10) / 10,
    incomeByClient,
    expenseByCategory,
    payrollByEmployee,
    commissionByStakeholder,
    isDistributed: !!distribution,
    distributedPkr: distribution ? Number(distribution.totalDistributedPkr) : null,
    distributionRunAt: distribution?.runAt?.toISOString() ?? null,
    allCommissionsCount: commissions.length,
    pendingCommissionsCount: commissions.filter((c) => c.status === "pending").length,
    pendingPayrollCount,
    pendingPayrollPkr,
  };
}

// ─── Cash Flow Statement ──────────────────────────────────────────────────────

export async function getCashFlowStatement(period?: string) {
  const pf = periodWhere(period);

  const [incomes, expenses, payrolls, distributions, operatingAccount] = await Promise.all([
    prisma.incomeRecord.findMany({
      where: pf,
      include: { client: { select: { companyName: true } }, invoice: { select: { invoiceNumber: true } } },
      orderBy: { receivedAt: "asc" },
    }),

    prisma.expense.findMany({
      where: excludePayrollExpenses(pf),
      orderBy: { date: "asc" },
    }),

    prisma.payrollRecord.findMany({
      where: { ...pf, status: "paid" },
      include: {
        user: { select: { name: true } },
        employee: { select: { name: true } },
      },
      orderBy: { paidAt: "asc" },
    }),

    prisma.distribution.findMany({
      where: pf,
      orderBy: { runAt: "asc" },
    }),

    prisma.crmAccount.findFirst({
      where: { isDefaultOperating: true },
      select: { name: true, currentBalancePkr: true },
    }),
  ]);

  const inflows = incomes.map((r) => ({
    date: r.receivedAt.toISOString(),
    description: r.incomeType ?? "Payment received",
    party: r.client.companyName,
    reference: r.invoice?.invoiceNumber ?? null,
    amountPkr: Number(r.netPkr),
    status: r.status,
  }));

  const outflows: {
    date: string;
    description: string;
    party: string | null;
    reference: string | null;
    amountPkr: number;
    type: "expense" | "payroll" | "distribution";
  }[] = [];

  for (const e of expenses) {
    outflows.push({
      date: e.date.toISOString(),
      description: `${e.category}: ${e.description}`,
      party: null,
      reference: null,
      amountPkr: Number(e.amountPkr),
      type: "expense",
    });
  }

  for (const p of payrolls) {
    outflows.push({
      date: (p.paidAt ?? p.createdAt).toISOString(),
      description: "Salary",
      party: p.user?.name ?? p.employee?.name ?? "Employee",
      reference: null,
      amountPkr: Number(p.netPkr),
      type: "payroll",
    });
  }

  for (const distribution of distributions) {
    outflows.push({
      date: distribution.runAt.toISOString(),
      description: "Profit distribution",
      party: null,
      reference: distribution.period,
      amountPkr: Number(distribution.operatingBalancePkr),
      type: "distribution",
    });
  }

  outflows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalInflowPkr = inflows.reduce((s, r) => s + r.amountPkr, 0);
  const totalOutflowPkr = outflows.reduce((s, r) => s + r.amountPkr, 0);
  const netCashFlowPkr = totalInflowPkr - totalOutflowPkr;

  return {
    period: period ?? "all",
    inflows,
    outflows,
    totalInflowPkr,
    totalOutflowPkr,
    netCashFlowPkr,
    operatingAccountName: operatingAccount?.name ?? null,
    operatingBalancePkr: operatingAccount ? Number(operatingAccount.currentBalancePkr) : null,
  };
}
