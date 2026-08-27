import { prisma } from "@backend/lib/prisma";
import { excludePayrollExpenses } from "@backend/lib/financialFilters";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface StatementEntry {
  id: string;
  period: string;      // YYYY-MM — matches P&L / cash flow period field
  date: string;        // ISO datetime string — used for sorting
  description: string;
  type: "income" | "expense" | "payroll" | "distribution";
  credit: number;      // paise — money IN to account
  debit: number;       // paise — money OUT of account
  balance: number;     // paise — running balance at this point
}

export interface AccountStatementResult {
  account: {
    id: string;
    name: string;
    type: string;
    currentBalancePkr: number;
  };
  period: string | null;  // YYYY-MM or null for all time
  openingBalance: number;
  entries: StatementEntry[];
  closingBalance: number;
  totalIn: number;
  totalOut: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Walk a sorted entry list and stamp each entry with its running balance. */
function computeRunningBalances(
  entries: Omit<StatementEntry, "balance">[],
  startingBalance: number
): StatementEntry[] {
  let running = startingBalance;
  return entries.map((e) => {
    running = running + e.credit - e.debit;
    return { ...e, balance: running };
  });
}

function closingBalanceFrom(entries: StatementEntry[]): number {
  return entries.length > 0 ? entries[entries.length - 1].balance : 0;
}

// ─── Operating account entries ────────────────────────────────────────────────

async function fetchOperatingEntries(): Promise<Omit<StatementEntry, "balance">[]> {
  const [incomes, expenses, payrolls, distributions] = await Promise.all([
    prisma.incomeRecord.findMany({
      include: {
        client: { select: { companyName: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    }),

    prisma.expense.findMany({
      where: excludePayrollExpenses(),
    }),

    // Cash out — only paid payroll actually left the operating account
    prisma.payrollRecord.findMany({
      where: { status: "paid" },
      include: {
        user: { select: { name: true } },
        employee: { select: { name: true } },
      },
    }),

    prisma.distribution.findMany(),
  ]);

  const entries: Omit<StatementEntry, "balance">[] = [];

  for (const r of incomes) {
    const clientName = r.client?.companyName ?? "Income";
    const ref = r.invoice?.invoiceNumber ?? (r.incomeType ?? "Income");
    entries.push({
      id: r.id,
      period: r.period,
      date: r.receivedAt.toISOString(),
      description: `${clientName} — ${ref}`,
      type: "income",
      credit: Number(r.netPkr),
      debit: 0,
    });
  }

  for (const e of expenses) {
    entries.push({
      id: e.id,
      period: e.period,
      date: e.date.toISOString(),
      description: `${e.category} — ${e.description}`,
      type: "expense",
      credit: 0,
      debit: Number(e.amountPkr),
    });
  }

  for (const p of payrolls) {
    const name = p.user?.name ?? p.employee?.name ?? "Payroll";
    entries.push({
      id: p.id,
      period: p.period,
      date: (p.paidAt ?? p.createdAt).toISOString(),
      description: `${name} payroll — ${p.period}`,
      type: "payroll",
      credit: 0,
      debit: Number(p.netPkr),
    });
  }

  for (const d of distributions) {
    entries.push({
      id: d.id,
      period: d.period,
      date: d.runAt.toISOString(),
      description: d.label ?? `Distribution — ${d.period}`,
      type: "distribution",
      credit: 0,
      debit: Number(d.operatingBalancePkr),
    });
  }

  return entries;
}

// ─── Stakeholder / reserve account entries ────────────────────────────────────

async function fetchStakeholderEntries(
  accountId: string
): Promise<Omit<StatementEntry, "balance">[]> {
  const items = await prisma.distributionItem.findMany({
    where: { accountId },
    include: {
      distribution: {
        select: { runAt: true, period: true, label: true, id: true },
      },
    },
  });

  return items.map((item) => ({
    id: item.id,
    period: item.distribution.period,
    date: item.distribution.runAt.toISOString(),
    description:
      item.distribution.label ?? `Distribution — ${item.distribution.period}`,
    type: "distribution" as const,
    credit: Number(item.totalPkr),
    debit: 0,
  }));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getAccountStatement(
  accountId: string,
  period?: string
): Promise<AccountStatementResult> {
  const account = await prisma.crmAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      type: true,
      currentBalancePkr: true,
    },
  });

  if (!account) throw new Error("Account not found");

  const rawEntries =
    account.type === "operating"
      ? await fetchOperatingEntries()
      : await fetchStakeholderEntries(accountId);

  rawEntries.sort((a, b) => {
    const byDate = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    if (byDate !== 0) return byDate;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const allEntries = computeRunningBalances(rawEntries, 0);

  if (period) {
    const priorRaw = rawEntries.filter((e) => e.period < period);
    const priorEntries = computeRunningBalances(priorRaw, 0);
    const openingBalance = priorEntries.length > 0 ? closingBalanceFrom(priorEntries) : 0;

    const periodRaw = rawEntries.filter((e) => e.period === period);
    const rebasedEntries = computeRunningBalances(periodRaw, openingBalance);

    const totalIn = rebasedEntries.reduce((s, e) => s + e.credit, 0);
    const totalOut = rebasedEntries.reduce((s, e) => s + e.debit, 0);
    const closingBalance =
      rebasedEntries.length > 0 ? closingBalanceFrom(rebasedEntries) : openingBalance;

    return {
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        currentBalancePkr: Number(account.currentBalancePkr),
      },
      period,
      openingBalance,
      entries: rebasedEntries,
      closingBalance,
      totalIn,
      totalOut,
    };
  }

  const totalIn = allEntries.reduce((s, e) => s + e.credit, 0);
  const totalOut = allEntries.reduce((s, e) => s + e.debit, 0);
  const closingBalance = closingBalanceFrom(allEntries);

  return {
    account: {
      id: account.id,
      name: account.name,
      type: account.type,
      currentBalancePkr: Number(account.currentBalancePkr),
    },
    period: null,
    openingBalance: 0,
    entries: allEntries,
    closingBalance,
    totalIn,
    totalOut,
  };
}
