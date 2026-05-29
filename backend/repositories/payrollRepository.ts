import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";
import type { CreatePayrollInput, UpdatePayrollInput, ListPayrollInput, RunPayrollInput } from "@backend/validators/payrollValidator";
import type { Prisma } from "@prisma/client";

const payrollSelect = {
  id: true,
  period: true,
  grossPkr: true,
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
  const grossPkr = BigInt(Math.round(input.grossPkr * AMOUNT_MULTIPLIER));
  const deductions = BigInt(Math.round((input.deductions ?? 0) * AMOUNT_MULTIPLIER));
  const netPkr = grossPkr - deductions;

  return prisma.payrollRecord.create({
    data: {
      userId: input.userId ?? null,
      employeeId: input.employeeId ?? null,
      period: input.period,
      grossPkr,
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
    select: { grossPkr: true, deductions: true },
  });
  if (!current) return null;

  const grossPkr = input.grossPkr !== undefined
    ? BigInt(Math.round(input.grossPkr * AMOUNT_MULTIPLIER))
    : current.grossPkr;
  const deductions = input.deductions !== undefined
    ? BigInt(Math.round(input.deductions * AMOUNT_MULTIPLIER))
    : current.deductions;
  const netPkr = grossPkr - deductions;

  return prisma.payrollRecord.update({
    where: { id },
    data: {
      grossPkr,
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
    select: { netPkr: true },
  });
  if (!record) return null;

  const paidAt = new Date();

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

    // Deduct from operating account balance
    if (operatingAccount) {
      await tx.crmAccount.update({
        where: { id: operatingAccount.id },
        data: { currentBalancePkr: { decrement: record.netPkr } },
      });
    }

    return updated;
  });
}

export async function payrollExists(id: string): Promise<boolean> {
  return (await prisma.payrollRecord.count({ where: { id } })) > 0;
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

export async function getPayrollSummaryByPeriod(period: string) {
  return prisma.payrollRecord.aggregate({
    where: { period },
    _sum: { grossPkr: true, deductions: true, netPkr: true },
    _count: true,
  });
}

export async function runPayrollBatch(input: RunPayrollInput) {
  const { period, entries } = input;
  const paidAt = new Date();

  return prisma.$transaction(async (tx) => {
    const operatingAccount = await tx.crmAccount.findFirst({
      where: { type: "operating", isDefaultOperating: true },
      select: { id: true },
    });

    const created: Prisma.PayrollRecordGetPayload<{ select: typeof payrollSelect }>[] = [];
    let skipped = 0;
    let totalNet = BigInt(0);

    for (const entry of entries) {
      // Skip if payroll already exists for this person/period
      const exists = await tx.payrollRecord.count({
        where: {
          period,
          ...(entry.employeeId ? { employeeId: entry.employeeId } : { userId: entry.userId }),
        },
      });
      if (exists > 0) { skipped++; continue; }

      const grossPkr   = BigInt(Math.round(entry.grossPkr * AMOUNT_MULTIPLIER));
      const deductions = BigInt(Math.round((entry.deductions ?? 0) * AMOUNT_MULTIPLIER));
      const netPkr     = grossPkr - deductions;

      const record = await tx.payrollRecord.create({
        data: {
          period,
          grossPkr,
          deductions,
          netPkr,
          status: "paid",
          paidAt,
          notes: entry.notes ?? null,
          userId: entry.userId ?? null,
          employeeId: entry.employeeId ?? null,
        },
        select: payrollSelect,
      });

      created.push(record);
      totalNet += netPkr;
    }

    // Deduct total net from operating account in one update
    if (operatingAccount && totalNet > 0) {
      await tx.crmAccount.update({
        where: { id: operatingAccount.id },
        data: { currentBalancePkr: { decrement: totalNet } },
      });
    }

    return { created: created.length, skipped, records: created };
  });
}
