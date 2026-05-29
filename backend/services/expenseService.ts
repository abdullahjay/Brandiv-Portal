import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";
import {
  findManyExpenses,
  findExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@backend/repositories/expenseRepository";
import type { CreateExpenseInput, UpdateExpenseInput, ListExpensesInput } from "@backend/validators/expenseValidator";

async function getOperatingAccountId(): Promise<string | null> {
  const account = await prisma.crmAccount.findFirst({
    where: { type: "operating", isDefaultOperating: true },
    select: { id: true },
  });
  return account?.id ?? null;
}

export async function listExpenses(input: ListExpensesInput) {
  return findManyExpenses(input);
}

export async function getExpense(id: string) {
  return findExpenseById(id);
}

export async function addExpense(input: CreateExpenseInput) {
  const expense = await createExpense(input);

  // Deduct from operating account — keep balance in sync with P&L
  const amountPkr = BigInt(Math.round(input.amountPkr * AMOUNT_MULTIPLIER));
  const opAccountId = await getOperatingAccountId();
  if (opAccountId) {
    await prisma.crmAccount.update({
      where: { id: opAccountId },
      data: { currentBalancePkr: { decrement: amountPkr } },
    });
  }

  return expense;
}

export async function editExpense(id: string, input: UpdateExpenseInput) {
  const existing = await findExpenseById(id);
  if (!existing) return null;

  const updated = await updateExpense(id, input);

  // Adjust operating account when amount changes
  if (input.amountPkr !== undefined) {
    const oldAmt = existing.amountPkr as bigint;
    const newAmt = BigInt(Math.round(input.amountPkr * AMOUNT_MULTIPLIER));
    const delta = newAmt - oldAmt; // positive = user increased expense
    if (delta !== BigInt(0)) {
      const opAccountId = await getOperatingAccountId();
      if (opAccountId) {
        await prisma.crmAccount.update({
          where: { id: opAccountId },
          data: { currentBalancePkr: { decrement: delta } },
        });
      }
    }
  }

  return updated;
}

export async function removeExpense(id: string) {
  const existing = await findExpenseById(id);
  if (!existing) return null;

  await deleteExpense(id);

  // Restore operating account balance
  const opAccountId = await getOperatingAccountId();
  if (opAccountId) {
    await prisma.crmAccount.update({
      where: { id: opAccountId },
      data: { currentBalancePkr: { increment: existing.amountPkr as bigint } },
    });
  }

  return true;
}
