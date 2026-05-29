import { prisma } from "@backend/lib/prisma";
import type { ListCommissionsInput } from "@backend/validators/commissionValidator";
import type { Prisma } from "@prisma/client";

const commissionSelect = {
  id: true,
  period: true,
  paymentNumber: true,
  ratePct: true,
  baseAmountPkr: true,
  commissionPkr: true,
  status: true,
  createdAt: true,
  stakeholderAccount: { select: { id: true, name: true, ownerUser: { select: { name: true, avatarUrl: true } } } },
  client: { select: { id: true, companyName: true } },
  project: { select: { id: true, name: true } },
  invoice: { select: { id: true, invoiceNumber: true } },
  incomeRecord: { select: { id: true, originalAmount: true, originalCurrency: true, receivedAt: true } },
} satisfies Prisma.CommissionSelect;

export async function findManyCommissions(input: ListCommissionsInput) {
  const { status, stakeholderAccountId, clientId, period, page, pageSize } = input;

  const where: Prisma.CommissionWhereInput = {
    ...(status !== "all" && { status }),
    ...(stakeholderAccountId && { stakeholderAccountId }),
    ...(clientId && { clientId }),
    ...(period && { period }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.commission.findMany({
      where,
      select: commissionSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.commission.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findCommissionById(id: string) {
  return prisma.commission.findUnique({ where: { id }, select: commissionSelect });
}

export async function approveCommission(id: string) {
  return prisma.commission.update({
    where: { id },
    data: { status: "approved" },
    select: commissionSelect,
  });
}

export async function commissionExists(id: string): Promise<boolean> {
  return (await prisma.commission.count({ where: { id } })) > 0;
}

export async function getCommissionSummary() {
  const [pending, approved, total] = await prisma.$transaction([
    prisma.commission.aggregate({ where: { status: "pending" }, _sum: { commissionPkr: true }, _count: true }),
    prisma.commission.aggregate({ where: { status: "approved" }, _sum: { commissionPkr: true }, _count: true }),
    prisma.commission.aggregate({ _sum: { commissionPkr: true }, _count: true }),
  ]);
  return { pending, approved, total };
}
