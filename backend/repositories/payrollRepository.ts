import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";
import type { CreatePayrollInput, UpdatePayrollInput, ListPayrollInput, RunPayrollInput } from "@backend/validators/payrollValidator";
import type { Prisma } from "@prisma/client";

const payrollSelect = {
  id: true,
  period: true,
  grossPkr: true,
  taxPkr: true,
  deductions: true,
  netPkr: true,
  status: true,
  paidAt: true,
  notes: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
  employee: { select: { id: true, name: true, designation: true, department: true } },
} satisfies Prisma.PayrollRecordSelect;

export async function findManyPayroll(input: ListPayrollInput) {
  const { status, userId, employeeId, period, page, pageSize } = input;

  const where: Prisma.PayrollRecordWhereInput = {
    ...(status !== "all" && { status }),
    ...(userId && { userId }),
    ...(employeeId && { employeeId }),
    ...(period && { period }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.payrollRecord.findMany({
      where,
      select: payrollSelect,
      orderBy: [{ period: "desc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payrollRecord.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findPayrollById(id: string) {
  return prisma.payrollRecord.findUnique({ where: { id }, select: payrollSelect });
}

export async function createPayrollRecord(input: CreatePayrollInput) {
  const grossPkr   = BigInt(Math.round(input.grossPkr * AMOUNT_MULTIPLIER));
  const taxPkr     = BigInt(Math.round((input.taxPkr ?? 0) * AMOUNT_MULTIPLIER));
  const deductions = BigInt(Math.round((input.deductions ?? 0) * AMOUNT_MULTIPLIER));
  const netPkr     = grossPkr - taxPkr - deductions;

  return prisma.payrollRecord.create({
    data: {
      userId: input.userId ?? null,
      employeeId: input.employeeId ?? null,
      period: input.period,
      grossPkr,
      taxPkr,
      deductions,
      netPkr,
      notes: input.notes ?? null,
      status: "pending",
    },
    select: payrollSelect,
  });
}

export async function updatePayrollRecord(id: string, input: UpdatePayrollInput) {
  const current = await prisma.payrollRecord.findUnique({
    where: { id },
    select: { grossPkr: true, taxPkr: true, deductions: true },
  });
  if (!current) return null;

  const grossPkr = input.grossPkr !== undefined
    ? BigInt(Math.round(input.grossPkr * AMOUNT_MULTIPLIER))
    : current.grossPkr;
  const taxPkr = input.taxPkr !== undefined
    ? BigInt(Math.round(input.taxPkr * AMOUNT_MULTIPLIER))
    : current.taxPkr;
  const deductions = input.deductions !== undefined
    ? BigInt(Math.round(input.deductions * AMOUNT_MULTIPLIER))
    : current.deductions;
  const netPkr = grossPkr - taxPkr - deductions;

  return prisma.payrollRecord.update({
    where: { id },
    data: {
      grossPkr,
      taxPkr,
      deductions,
      netPkr,
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    select: payrollSelect,
  });
}

export async function markPayrollPaid(id: string) {
  const record = await prisma.payrollRecord.findUnique({
    where: { id },
    select: {
      netPkr: true,
      grossPkr: true,
      taxPkr: true,
      deductions: true,
      period: true,
      notes: true,
      employee: { select: { name: true } },
      user: { select: { name: true } },
    },
  });
  if (!record) return null;

  const paidAt = new Date();
  const period = record.period;
  const recipientName = record.employee?.name ?? record.user?.name ?? "Employee";
  const expensePeriod = period;
  const expenseNotes = [
    `Tax: PKR ${(Number(record.taxPkr) / 100).toLocaleString()}`,
    `Deductions: PKR ${(Number(record.deductions) / 100).toLocaleString()}`,
    `Net paid: PKR ${(Number(record.netPkr) / 100).toLocaleString()}`,
  ].join(" · ");

  const operatingAccount = await prisma.crmAccount.findFirst({
    where: { type: "operating", isDefaultOperating: true },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payrollRecord.update({
      where: { id },
      data: { status: "paid", paidAt },
      select: payrollSelect,
    });

    if (operatingAccount) {
      await tx.crmAccount.update({
        where: { id: operatingAccount.id },
        data: { currentBalancePkr: { decrement: record.netPkr } },
      });
    }

    // Auto-create expense entry for this salary payment
    await tx.expense.create({
      data: {
        description: `Salary — ${recipientName} (${period})`,
        category: "Salaries",
        amountPkr: record.grossPkr,
        period: expensePeriod,
        date: paidAt,
        notes: expenseNotes,
      },
    });

    return updated;
  });
}

export async function payrollExists(id: string): Promise<boolean> {
  return !!(await prisma.payrollRecord.findUnique({ where: { id }, select: { id: true } }));
}

export async function payrollDuplicate(userId: string | undefined, employeeId: string | undefined, period: string): Promise<boolean> {
  if (userId) {
    return (await prisma.payrollRecord.count({ where: { userId, period } })) > 0;
  }
  if (employeeId) {
    return (await prisma.payrollRecord.count({ where: { employeeId, period } })) > 0;
  }
  return false;
}

export async function revertPayrollToPending(id: string) {
  const record = await prisma.payrollRecord.findUnique({
    where: { id },
    select: {
      netPkr: true,
      period: true,
      employee: { select: { name: true } },
      user: { select: { name: true } },
    },
  });
  if (!record) return null;

  const recipientName = record.employee?.name ?? record.user?.name ?? "Employee";
  const expenseDescription = `Salary — ${recipientName} (${record.period})`;

  const operatingAccount = await prisma.crmAccount.findFirst({
    where: { type: "operating", isDefaultOperating: true },
    select: { id: true },
  });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payrollRecord.update({
      where: { id },
      data: { status: "pending", paidAt: null },
      select: payrollSelect,
    });

    if (operatingAccount) {
      await tx.crmAccount.update({
        where: { id: operatingAccount.id },
        data: { currentBalancePkr: { increment: record.netPkr } },
      });
    }

    // Remove the auto-created expense entry for this salary payment
    await tx.expense.deleteMany({
      where: { description: expenseDescription },
    });

    return updated;
  });
}

export async function getPayrollSummaryByPeriod(period: string) {
  return prisma.payrollRecord.aggregate({
    where: { period },
    _sum: { grossPkr: true, taxPkr: true, deductions: true, netPkr: true },
    _count: true,
  });
}

export async function runPayrollBatch(input: RunPayrollInput) {
  const { period, entries, markAsPaid = false } = input;
  const paidAt = markAsPaid ? new Date() : null;
  const expensePeriod = markAsPaid ? period : "";

  return prisma.$transaction(async (tx) => {
    const employeeIds = entries.map((e) => e.employeeId).filter(Boolean) as string[];
    const userIds     = entries.map((e) => e.userId).filter(Boolean) as string[];

    // Batch pre-fetch: existing records + recipient names — replaces N×2 per-entry queries
    const [operatingAccount, existingRecords, employeeRows, userRows] = await Promise.all([
      markAsPaid
        ? tx.crmAccount.findFirst({ where: { type: "operating", isDefaultOperating: true }, select: { id: true } })
        : Promise.resolve(null),
      tx.payrollRecord.findMany({
        where: {
          period,
          OR: [
            ...(employeeIds.length > 0 ? [{ employeeId: { in: employeeIds } }] : []),
            ...(userIds.length > 0     ? [{ userId:     { in: userIds     } }] : []),
          ],
        },
        select: {
          id: true, employeeId: true, userId: true, status: true,
          grossPkr: true, taxPkr: true, deductions: true, netPkr: true,
          employee: { select: { name: true } }, user: { select: { name: true } },
        },
      }),
      employeeIds.length > 0
        ? tx.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: string; name: string }[]),
      userIds.length > 0
        ? tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: string; name: string }[]),
    ]);

    // Build O(1) lookup maps
    const existingByKey = new Map<string, {
      id: string; status: string; name: string;
      grossPkr: bigint; taxPkr: bigint; deductions: bigint; netPkr: bigint;
    }>();
    for (const r of existingRecords) {
      const key = r.employeeId ?? r.userId!;
      existingByKey.set(key, {
        id: r.id,
        status: r.status,
        name: r.employee?.name ?? r.user?.name ?? "Unknown",
        grossPkr: r.grossPkr, taxPkr: r.taxPkr, deductions: r.deductions, netPkr: r.netPkr,
      });
    }
    const employeeNameMap = new Map(employeeRows.map((e) => [e.id, e.name]));
    const userNameMap     = new Map(userRows.map((u) => [u.id, u.name]));

    const created: Prisma.PayrollRecordGetPayload<{ select: typeof payrollSelect }>[] = [];
    let skipped = 0;
    let totalNet = BigInt(0);
    const alreadyPaid: string[] = [];

    for (const entry of entries) {
      const key      = entry.employeeId ?? entry.userId!;
      const existing = existingByKey.get(key);

      if (existing) {
        if (existing.status === "paid") {
          alreadyPaid.push(existing.name);
          skipped++;
          continue;
        }

        // existing is pending — always update amounts from the submitted entry
        const grossPkr   = BigInt(Math.round(entry.grossPkr * AMOUNT_MULTIPLIER));
        const taxPkr     = BigInt(Math.round((entry.taxPkr ?? 0) * AMOUNT_MULTIPLIER));
        const deductions = BigInt(Math.round((entry.deductions ?? 0) * AMOUNT_MULTIPLIER));
        const netPkr     = grossPkr - taxPkr - deductions;

        if (markAsPaid && paidAt) {
          const expenseNotes = [
            `Tax: PKR ${(Number(taxPkr) / 100).toLocaleString()}`,
            `Deductions: PKR ${(Number(deductions) / 100).toLocaleString()}`,
            `Net paid: PKR ${(Number(netPkr) / 100).toLocaleString()}`,
          ].join(" · ");

          const updatedRecord = await tx.payrollRecord.update({
            where: { id: existing.id },
            data: { grossPkr, taxPkr, deductions, netPkr, status: "paid", paidAt },
            select: payrollSelect,
          });

          await tx.expense.create({
            data: {
              description: `Salary — ${existing.name} (${period})`,
              category: "Salaries",
              amountPkr: grossPkr,
              period: expensePeriod,
              date: paidAt,
              notes: expenseNotes,
            },
          });

          totalNet += netPkr;
          created.push(updatedRecord);
        } else {
          // Update amounts only, keep pending status
          const updatedRecord = await tx.payrollRecord.update({
            where: { id: existing.id },
            data: { grossPkr, taxPkr, deductions, netPkr },
            select: payrollSelect,
          });
          created.push(updatedRecord);
        }
        continue;
      }

      const grossPkr   = BigInt(Math.round(entry.grossPkr * AMOUNT_MULTIPLIER));
      const taxPkr     = BigInt(Math.round((entry.taxPkr ?? 0) * AMOUNT_MULTIPLIER));
      const deductions = BigInt(Math.round((entry.deductions ?? 0) * AMOUNT_MULTIPLIER));
      const netPkr     = grossPkr - taxPkr - deductions;

      const recipientName = entry.employeeId
        ? (employeeNameMap.get(entry.employeeId) ?? "Employee")
        : (userNameMap.get(entry.userId!)        ?? "Employee");

      const record = await tx.payrollRecord.create({
        data: {
          period,
          grossPkr,
          taxPkr,
          deductions,
          netPkr,
          status: markAsPaid ? "paid" : "pending",
          paidAt: paidAt ?? null,
          notes: entry.notes ?? null,
          userId: entry.userId ?? null,
          employeeId: entry.employeeId ?? null,
        },
        select: payrollSelect,
      });

      if (markAsPaid && paidAt) {
        const expenseNotes = [
          `Tax: PKR ${(Number(taxPkr) / 100).toLocaleString()}`,
          `Deductions: PKR ${(Number(deductions) / 100).toLocaleString()}`,
          `Net paid: PKR ${(Number(netPkr) / 100).toLocaleString()}`,
        ].join(" · ");

        await tx.expense.create({
          data: {
            description: `Salary — ${recipientName} (${period})`,
            category: "Salaries",
            amountPkr: grossPkr,
            period: expensePeriod,
            date: paidAt,
            notes: expenseNotes,
          },
        });

        totalNet += netPkr;
      }

      created.push(record);
    }

    if (markAsPaid && operatingAccount && totalNet > 0) {
      await tx.crmAccount.update({
        where: { id: operatingAccount.id },
        data: { currentBalancePkr: { decrement: totalNet } },
      });
    }

    return { created: created.length, skipped, records: created, alreadyPaid };
  });
}
