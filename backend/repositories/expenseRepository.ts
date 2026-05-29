import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";
import type { CreateExpenseInput, UpdateExpenseInput, ListExpensesInput } from "@backend/validators/expenseValidator";
import type { Prisma } from "@prisma/client";

const expenseSelect = {
  id: true,
  description: true,
  category: true,
  amountPkr: true,
  originalAmount: true,
  originalCurrency: true,
  exchangeRate: true,
  period: true,
  date: true,
  receiptUrl: true,
  notes: true,
  createdAt: true,
  project: { select: { id: true, name: true } },
} satisfies Prisma.ExpenseSelect;

function derivePeriod(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function findManyExpenses(input: ListExpensesInput) {
  const { category, projectId, period, search, page, pageSize } = input;

  const where: Prisma.ExpenseWhereInput = {
    ...(category && { category }),
    ...(projectId && { projectId }),
    ...(period && { period }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      select: expenseSelect,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findExpenseById(id: string) {
  return prisma.expense.findUnique({ where: { id }, select: expenseSelect });
}

export async function createExpense(input: CreateExpenseInput) {
  const period = derivePeriod(input.date);
  const amountPkr = BigInt(Math.round(input.amountPkr * AMOUNT_MULTIPLIER));
  const originalAmount = input.originalAmount != null
    ? BigInt(Math.round(input.originalAmount * AMOUNT_MULTIPLIER))
    : null;

  return prisma.expense.create({
    data: {
      description: input.description,
      category: input.category,
      amountPkr,
      originalAmount,
      originalCurrency: input.originalCurrency ?? null,
      exchangeRate: input.exchangeRate ?? null,
      period,
      date: new Date(input.date),
      projectId: input.projectId ?? null,
      receiptUrl: input.receiptUrl ?? null,
      notes: input.notes ?? null,
    },
    select: expenseSelect,
  });
}

export async function updateExpense(id: string, input: UpdateExpenseInput) {
  const data: Prisma.ExpenseUpdateInput = {};

  if (input.description !== undefined) data.description = input.description;
  if (input.category !== undefined) data.category = input.category;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.receiptUrl !== undefined) data.receiptUrl = input.receiptUrl;
  if (input.projectId !== undefined) {
    data.project = input.projectId ? { connect: { id: input.projectId } } : { disconnect: true };
  }

  if (input.amountPkr !== undefined) {
    data.amountPkr = BigInt(Math.round(input.amountPkr * AMOUNT_MULTIPLIER));
  }
  if (input.originalAmount !== undefined) {
    data.originalAmount = input.originalAmount != null
      ? BigInt(Math.round(input.originalAmount * AMOUNT_MULTIPLIER))
      : null;
  }
  if (input.originalCurrency !== undefined) data.originalCurrency = input.originalCurrency;
  if (input.exchangeRate !== undefined) data.exchangeRate = input.exchangeRate;

  if (input.date !== undefined) {
    data.date = new Date(input.date);
    data.period = derivePeriod(input.date);
  }

  return prisma.expense.update({ where: { id }, data, select: expenseSelect });
}

export async function deleteExpense(id: string) {
  return prisma.expense.delete({ where: { id } });
}

export async function expenseExists(id: string): Promise<boolean> {
  return (await prisma.expense.count({ where: { id } })) > 0;
}

export async function getExpenseSummaryByPeriod(period: string) {
  return prisma.expense.aggregate({
    where: { period },
    _sum: { amountPkr: true },
    _count: true,
  });
}
