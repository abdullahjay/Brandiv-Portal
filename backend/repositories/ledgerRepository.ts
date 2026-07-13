import { prisma } from "@backend/lib/prisma";

export interface LedgerRow {
  id: string;
  type: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer" | "adjustment";
  date: string;
  period: string;
  description: string;
  party: string | null;
  reference: string | null;
  pkrAmount: number; // positive = inflow, negative = outflow; 0 for neutral transfers
  status: string;
}

export interface LedgerQuery {
  period?: string;
  type?: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer" | "adjustment";
  page: number;
  pageSize: number;
}

// Per-type cap when no period filter is active — prevents full-table scan on unbounded queries
const LEDGER_UNFILTERED_CAP = 500;

export async function listLedgerEntries(q: LedgerQuery) {
  const periodWhere = q.period ? { period: q.period } : {};
  const cap = q.period ? undefined : LEDGER_UNFILTERED_CAP;

  const [incomes, expenses, payrolls, distributions, commissions, transfers, adjustments] = await Promise.all([
    !q.type || q.type === "income"
      ? prisma.incomeRecord.findMany({
          where: periodWhere,
          select: {
            id: true, period: true, incomeType: true, netPkr: true, status: true, receivedAt: true,
            client: { select: { companyName: true } },
            invoice: { select: { invoiceNumber: true } },
          },
          orderBy: { receivedAt: "desc" },
          take: cap,
        })
      : [],

    !q.type || q.type === "expense"
      ? prisma.expense.findMany({
          where: { ...periodWhere, category: { not: "Salaries" } },
          select: { id: true, period: true, category: true, description: true, amountPkr: true, date: true },
          orderBy: { date: "desc" },
          take: cap,
        })
      : [],

    !q.type || q.type === "payroll"
      ? prisma.payrollRecord.findMany({
          where: { ...periodWhere, status: "paid" },
          select: {
            id: true, period: true, netPkr: true, status: true, paidAt: true, createdAt: true,
            user: { select: { name: true } },
            employee: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: cap,
        })
      : [],

    !q.type || q.type === "distribution"
      ? prisma.distribution.findMany({
          where: q.period ? { period: q.period } : {},
          select: { id: true, period: true, totalDistributedPkr: true, runAt: true },
          orderBy: { runAt: "desc" },
          take: cap,
        })
      : [],

    !q.type || q.type === "commission"
      ? prisma.commission.findMany({
          where: { ...periodWhere, status: { in: ["approved", "paid"] } },
          select: {
            id: true, period: true, commissionType: true, commissionPkr: true, status: true, createdAt: true,
            stakeholderAccount: { select: { name: true } },
            client: { select: { companyName: true } },
            project: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: cap,
        })
      : [],

    !q.type || q.type === "transfer"
      ? prisma.accountTransfer.findMany({
          where: periodWhere,
          select: {
            id: true, period: true, amountPkr: true, description: true, status: true, transferAt: true,
            fromAccount: { select: { name: true } },
            toAccount:   { select: { name: true } },
          },
          orderBy: { transferAt: "desc" },
          take: cap,
        })
      : [],

    !q.type || q.type === "adjustment"
      ? prisma.accountAdjustment.findMany({
          where: periodWhere,
          select: {
            id: true, period: true, amountPkr: true, note: true, adjustedAt: true,
            account: { select: { name: true } },
          },
          orderBy: { adjustedAt: "desc" },
          take: cap,
        })
      : [],
  ]);

  const rows: Array<{ _date: Date } & LedgerRow> = [];

  for (const r of incomes) {
    rows.push({
      id: r.id,
      type: "income",
      _date: r.receivedAt,
      date: r.receivedAt.toISOString(),
      period: r.period,
      description: r.incomeType ?? "Payment received",
      party: r.client.companyName,
      reference: r.invoice?.invoiceNumber ?? null,
      pkrAmount: Number(r.netPkr),
      status: r.status,
    });
  }

  for (const r of expenses) {
    rows.push({
      id: r.id,
      type: "expense",
      _date: r.date,
      date: r.date.toISOString(),
      period: r.period,
      description: `${r.category}: ${r.description}`,
      party: null,
      reference: null,
      pkrAmount: -Number(r.amountPkr),
      status: "completed",
    });
  }

  for (const r of payrolls) {
    rows.push({
      id: r.id,
      type: "payroll",
      _date: r.paidAt ?? r.createdAt,
      date: (r.paidAt ?? r.createdAt).toISOString(),
      period: r.period,
      description: `Salary — ${r.user?.name ?? r.employee?.name ?? "Employee"} (${r.period})`,
      party: r.user?.name ?? r.employee?.name ?? "Employee",
      reference: null,
      pkrAmount: -Number(r.netPkr),
      status: r.status,
    });
  }

  for (const r of distributions) {
    rows.push({
      id: r.id,
      type: "distribution",
      _date: r.runAt,
      date: r.runAt.toISOString(),
      period: r.period,
      description: "Profit distribution",
      party: null,
      reference: r.period,
      pkrAmount: -Number(r.totalDistributedPkr),
      status: "completed",
    });
  }

  for (const r of commissions) {
    const isManaging = r.commissionType === "managing";
    rows.push({
      id: r.id,
      type: "commission",
      _date: r.createdAt,
      date: r.createdAt.toISOString(),
      period: r.period,
      description: isManaging
        ? `Managing commission — ${r.stakeholderAccount.name}${r.project ? ` (${r.project.name})` : ""}`
        : "Commission accrued",
      party: r.stakeholderAccount.name,
      reference: r.client.companyName,
      pkrAmount: -Number(r.commissionPkr),
      status: r.status,
    });
  }

  for (const r of (transfers as typeof transfers)) {
    rows.push({
      id: r.id,
      type: "transfer",
      _date: r.transferAt,
      date: r.transferAt.toISOString(),
      period: r.period,
      description: r.description,
      party: `${r.fromAccount.name} → ${r.toAccount.name}`,
      reference: null,
      pkrAmount: Number(r.amountPkr),
      status: r.status,
    });
  }

  for (const r of adjustments) {
    rows.push({
      id: r.id,
      type: "adjustment",
      _date: r.adjustedAt,
      date: r.adjustedAt.toISOString(),
      period: r.period,
      description: r.note ?? "Balance adjustment",
      party: r.account.name,
      reference: null,
      pkrAmount: Number(r.amountPkr),
      status: "completed",
    });
  }

  rows.sort((a, b) => b._date.getTime() - a._date.getTime());

  const total = rows.length;
  const start = (q.page - 1) * q.pageSize;
  const items: LedgerRow[] = rows.slice(start, start + q.pageSize).map(({ _date, ...rest }) => rest);

  return { items, total, page: q.page, pageSize: q.pageSize };
}
