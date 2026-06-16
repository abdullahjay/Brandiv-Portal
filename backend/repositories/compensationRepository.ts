import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";

export async function upsertCompensation(data: {
  employeeId: string;
  effectiveFrom: string;
  baseSalary: number;
  defaultTaxPkr: number;
  notes?: string | null;
}) {
  return prisma.employeeCompensation.upsert({
    where: { employeeId_effectiveFrom: { employeeId: data.employeeId, effectiveFrom: data.effectiveFrom } },
    create: {
      employeeId: data.employeeId,
      effectiveFrom: data.effectiveFrom,
      baseSalary: BigInt(Math.round(data.baseSalary * AMOUNT_MULTIPLIER)),
      defaultTaxPkr: BigInt(Math.round(data.defaultTaxPkr * AMOUNT_MULTIPLIER)),
      notes: data.notes ?? null,
    },
    update: {
      baseSalary: BigInt(Math.round(data.baseSalary * AMOUNT_MULTIPLIER)),
      defaultTaxPkr: BigInt(Math.round(data.defaultTaxPkr * AMOUNT_MULTIPLIER)),
      notes: data.notes ?? null,
    },
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
