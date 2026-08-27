import { Prisma } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import {
  PAYROLL_AUTO_EXPENSE_PREFIX,
  PAYROLL_EXPENSE_CATEGORIES,
} from "@backend/lib/constants";

/** True when an expense row mirrors a payroll_records payment (counted once under Payroll). */
export function isPayrollMirrorExpense(category: string, description: string): boolean {
  if (description.startsWith(PAYROLL_AUTO_EXPENSE_PREFIX)) return true;
  return (PAYROLL_EXPENSE_CATEGORIES as readonly string[]).includes(category);
}

/** Prisma where — omit payroll mirror expenses from statement / ledger expense queries. */
export function excludePayrollExpenses<T extends Record<string, unknown>>(where: T = {} as T) {
  const base = Object.keys(where).length > 0 ? where : {};
  return {
    AND: [
      base,
      {
        NOT: {
          OR: [
            { category: { in: [...PAYROLL_EXPENSE_CATEGORIES] } },
            { description: { startsWith: PAYROLL_AUTO_EXPENSE_PREFIX } },
          ],
        },
      },
    ],
  };
}

/** SQL fragment — exclude payroll mirror rows from raw ledger expense branch. */
export function ledgerExcludePayrollExpensesSql(): Prisma.Sql {
  return Prisma.sql`
    AND NOT (
      e.category IN (${Prisma.join(PAYROLL_EXPENSE_CATEGORIES)})
      OR e.description LIKE ${`${PAYROLL_AUTO_EXPENSE_PREFIX}%`}
    )
  `;
}

/** Where clause for legacy auto-created salary expense rows (safe to delete — payroll_records is canonical). */
export function payrollMirrorExpenseWhere() {
  return {
    OR: [
      { description: { startsWith: PAYROLL_AUTO_EXPENSE_PREFIX } },
      { category: { in: [...PAYROLL_EXPENSE_CATEGORIES] } },
    ],
  };
}

/** Remove duplicate salary expense rows; payroll_records remain the source of truth in statements. */
export async function removePayrollMirrorExpenses(): Promise<number> {
  const { count } = await prisma.expense.deleteMany({
    where: payrollMirrorExpenseWhere(),
  });
  return count;
}

/** Returns undefined for all-time queries (empty, "all", or missing). */
export function parseStatementPeriod(raw: string | null | undefined): string | undefined {
  if (!raw || raw === "all") return undefined;
  return raw;
}
