import { prisma } from "@backend/lib/prisma";

export interface LedgerRow {
  id: string;
  type: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer";
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
  type?: "income" | "expense" | "payroll" | "distribution" | "commission" | "transfer";
  page: number;
  pageSize: number;
}

export async function listLedgerEntries(q: LedgerQuery) {
  const periodWhere = q.period ? { period: q.period } : {};

  const [incomes, expenses, payrolls, distributions, commissions, transfers] = await Promise.all([
    !q.type || q.type === "income"
      ? prisma.incomeRecord.findMany({
          where: periodWhere,
          include: {
            client: { select: { companyName: true } },
            invoice: { select: { invoiceNumber: true } },
          },
        })
      : [],

    !q.type || q.type === "expense"
      ? prisma.expense.findMany({ where: periodWhere })
      : [],

    !q.type || q.type === "payroll"
      ? prisma.payrollRecord.findMany({
          where: periodWhere,
          include: {
            user: { select: { name: true } },
            employee: { select: { name: true } },
          },
        })
      : [],

    !q.type || q.type === "distribution"
      ? prisma.distribution.findMany({
          where: q.period ? { period: q.period } : {},
        })
      : [],

    !q.type || q.type === "commission"
      ? prisma.commission.findMany({
          where: periodWhere,
          include: {
            stakeholderAccount: { select: { name: true } },
            client: { select: { companyName: true } },
          },
        })
      : [],

    !q.type || q.type === "transfer"
      ? prisma.accountTransfer.findMany({
          where: periodWhere,
          include: {
            fromAccount: { select: { name: true } },
            toAccount:   { select: { name: true } },
          },
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
      description: "Salary",
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
    rows.push({
      id: r.id,
      type: "commission",
      _date: r.createdAt,
      date: r.createdAt.toISOString(),
      period: r.period,
      description: "Commission accrued",
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

  rows.sort((a, b) => b._date.getTime() - a._date.getTime());

  const total = rows.length;
  const start = (q.page - 1) * q.pageSize;
  const items: LedgerRow[] = rows.slice(start, start + q.pageSize).map(({ _date, ...rest }) => rest);

  return { items, total, page: q.page, pageSize: q.pageSize };
}
