import { prisma } from "@backend/lib/prisma";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface StatementEntry {
  id: string;
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

// ─── Operating account entries ────────────────────────────────────────────────

async function fetchOperatingEntries(): Promise<Omit<StatementEntry, "balance">[]> {
  const [incomes, expenses, payrolls, distributions] = await Promise.all([
    prisma.incomeRecord.findMany({
      include: {
        client: { select: { companyName: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    }),

    prisma.expense.findMany(),

    prisma.payrollRecord.findMany({
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
      date: e.date.toISOString(),
      description: `${e.category} — ${e.description}`,
      type: "expense",
      credit: 0,
      debit: Number(e.amountPkr),
    });
  }

  for (const p of payrolls) {
    const name = p.user?.name ?? p.employee?.name ?? "Payroll";
    const date = p.paidAt
      ? p.paidAt.toISOString()
      : new Date(p.period + "-01").toISOString();
    entries.push({
      id: p.id,
      date,
      description: `${name} payroll — ${p.period}`,
      type: "payroll",
      credit: 0,
      debit: Number(p.netPkr),
    });
  }

  for (const d of distributions) {
    entries.push({
      id: d.id,
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
  // 1. Load the account
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

  // 2. Fetch raw entries based on account type
  const rawEntries =
    account.type === "operating"
      ? await fetchOperatingEntries()
      : await fetchStakeholderEntries(accountId);

  // 3. Sort all entries by date ascending (ISO string comparison is safe)
  rawEntries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // 4. Stamp running balances starting from 0 (full history)
  const allEntries = computeRunningBalances(rawEntries, 0);

  // 5. Apply period filter if requested
  if (period) {
    const [yr, mo] = period.split("-").map(Number);
    const periodStart = new Date(yr, mo - 1, 1).toISOString();
    const periodEnd = new Date(yr, mo, 1).toISOString();

    // Opening balance = running balance of the last entry BEFORE periodStart
    const lastBefore = [...allEntries]
      .filter((e) => e.date < periodStart)
      .pop();
    const openingBalance = lastBefore?.balance ?? 0;

    // Filter to the period window
    const periodEntries = allEntries.filter(
      (e) => e.date >= periodStart && e.date < periodEnd
    );

    // Recompute balances relative to the opening balance
    const rebasedEntries = computeRunningBalances(
      periodEntries.map(({ balance: _b, ...rest }) => rest),
      openingBalance
    );

    const totalIn = rebasedEntries.reduce((s, e) => s + e.credit, 0);
    const totalOut = rebasedEntries.reduce((s, e) => s + e.debit, 0);
    const closingBalance =
      rebasedEntries.length > 0
        ? rebasedEntries[rebasedEntries.length - 1].balance
        : openingBalance;

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

  // 6. No period — return full history
  const totalIn = allEntries.reduce((s, e) => s + e.credit, 0);
  const totalOut = allEntries.reduce((s, e) => s + e.debit, 0);
  const closingBalance =
    allEntries.length > 0 ? allEntries[allEntries.length - 1].balance : 0;

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
