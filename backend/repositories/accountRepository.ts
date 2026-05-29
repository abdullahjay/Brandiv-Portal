import { prisma } from "@backend/lib/prisma";
import type { CreateAccountInput, UpdateAccountInput, ListAccountsInput } from "@backend/validators/accountValidator";
import type { Prisma } from "@prisma/client";

const accountSelect = {
  id: true,
  name: true,
  type: true,
  sharePct: true,
  currentBalancePkr: true,
  lifetimeDistPkr: true,
  lifetimeCommPkr: true,
  isDefaultOperating: true,
  createdAt: true,
  ownerUserId: true,
  ownerUser: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
} satisfies Prisma.CrmAccountSelect;

export async function findAllAccounts(input: ListAccountsInput) {
  const where: Prisma.CrmAccountWhereInput = input.type !== "all" ? { type: input.type } : {};
  return prisma.crmAccount.findMany({
    where,
    select: accountSelect,
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
}

export async function findAccountById(id: string) {
  return prisma.crmAccount.findUnique({ where: { id }, select: accountSelect });
}

export async function createAccount(data: CreateAccountInput) {
  return prisma.crmAccount.create({
    data: {
      name: data.name,
      type: data.type,
      sharePct: data.sharePct ?? 0,
      isDefaultOperating: data.isDefaultOperating ?? false,
      ownerUserId: data.ownerUserId ?? null,
    },
    select: accountSelect,
  });
}

export async function updateAccount(id: string, data: UpdateAccountInput) {
  const updates: Prisma.CrmAccountUpdateInput = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.sharePct !== undefined) updates.sharePct = data.sharePct;
  if (data.isDefaultOperating !== undefined) updates.isDefaultOperating = data.isDefaultOperating;
  if (data.ownerUserId !== undefined) {
    updates.ownerUser = data.ownerUserId
      ? { connect: { id: data.ownerUserId } }
      : { disconnect: true };
  }
  return prisma.crmAccount.update({ where: { id }, data: updates, select: accountSelect });
}

export async function getTotalDistributionSharePct(excludeId?: string): Promise<number> {
  const accounts = await prisma.crmAccount.findMany({
    where: {
      type: { in: ["stakeholder", "company_reserve"] },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { sharePct: true },
  });
  return accounts.reduce((sum, a) => sum + Number(a.sharePct), 0);
}

export async function accountExists(id: string): Promise<boolean> {
  return (await prisma.crmAccount.count({ where: { id } })) > 0;
}

export async function deleteAccount(id: string): Promise<void> {
  await prisma.crmAccount.delete({ where: { id } });
}
