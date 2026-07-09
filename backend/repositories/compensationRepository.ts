import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";

export async function upsertCompensation(data: {
  employeeId: string;
  effectiveFrom: string;
  baseSalary: number;
  defaultTaxPkr: number;
  notes?: string | null;
}) {
  const grossBig = BigInt(Math.round(data.baseSalary * AMOUNT_MULTIPLIER));
  const taxBig   = BigInt(Math.round(data.defaultTaxPkr * AMOUNT_MULTIPLIER));

  return prisma.$transaction(async (tx) => {
    // 1. Save the compensation record
    const comp = await tx.employeeCompensation.upsert({
      where: { employeeId_effectiveFrom: { employeeId: data.employeeId, effectiveFrom: data.effectiveFrom } },
      create: {
        employeeId: data.employeeId,
        effectiveFrom: data.effectiveFrom,
        baseSalary: grossBig,
        defaultTaxPkr: taxBig,
        notes: data.notes ?? null,
      },
      update: {
        baseSalary: grossBig,
        defaultTaxPkr: taxBig,
        notes: data.notes ?? null,
      },
    });

    // 2. Propagate to pending payroll records for period >= effectiveFrom
    //    Deductions are preserved per-record; only gross + tax are overwritten.
    const pendingRecords = await tx.payrollRecord.findMany({
      where: {
        employeeId: data.employeeId,
        period: { gte: data.effectiveFrom },
        status: "pending",
      },
      select: { id: true, deductions: true },
    });

    for (const record of pendingRecords) {
      const netPkr = grossBig - taxBig - record.deductions;
      await tx.payrollRecord.update({
        where: { id: record.id },
        data: {
          grossPkr: grossBig,
          taxPkr: taxBig,
          netPkr: netPkr > BigInt(0) ? netPkr : BigInt(0),
        },
      });
    }

    return comp;
  });
}

export async function deleteCompensation(id: string) {
  return prisma.employeeCompensation.delete({ where: { id } });
}

export async function getCompensationHistory(employeeId: string) {
  return prisma.employeeCompensation.findMany({
    where: { employeeId },
    orderBy: { effectiveFrom: "desc" },
  });
}

export async function getAllEmployeesWithCompensationHistory() {
  return prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      designation: true,
      department: true,
      baseSalary: true,
      defaultTaxPkr: true,
      status: true,
      compensations: {
        orderBy: { effectiveFrom: "desc" },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export async function getEffectiveCompensationsForPeriod(period: string) {
  const employees = await prisma.employee.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      baseSalary: true,
      defaultTaxPkr: true,
      compensations: {
        where: { effectiveFrom: { lte: period } },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  });
  return employees.map((emp) => {
    const comp = emp.compensations[0] ?? null;
    return {
      employeeId: emp.id,
      name: emp.name,
      baseSalary: comp ? comp.baseSalary : emp.baseSalary,
      defaultTaxPkr: comp ? comp.defaultTaxPkr : emp.defaultTaxPkr,
      effectiveFrom: comp?.effectiveFrom ?? null,
    };
  });
}
