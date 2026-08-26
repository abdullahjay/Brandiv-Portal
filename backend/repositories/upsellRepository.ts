import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";
import type { CreateUpsellInput, UpdateUpsellInput, ListUpsellsInput } from "@backend/validators/upsellValidator";
import type { Prisma } from "@prisma/client";

const upsellSelect = {
  id: true,
  title: true,
  description: true,
  billingMode: true,
  status: true,
  amountPkr: true,
  commissionRatePct: true,
  managingCommissionRatePct: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  completedAt: true,
  projectId: true,
  earnerAccountId: true,
  earnerAccount: { select: { id: true, name: true, ownerUser: { select: { name: true, avatarUrl: true } } } },
  managingPartnerId: true,
  managingPartner: { select: { id: true, name: true, ownerUser: { select: { name: true, avatarUrl: true } } } },
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
  commissions: {
    select: {
      id: true,
      commissionType: true,
      ratePct: true,
      baseAmountPkr: true,
      commissionPkr: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.ProjectUpsellSelect;

export async function findManyUpsellsByProject(projectId: string, input: ListUpsellsInput) {
  const { status, page, pageSize } = input;

  const where: Prisma.ProjectUpsellWhereInput = {
    projectId,
    ...(status !== "all" && { status }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.projectUpsell.findMany({
      where,
      select: upsellSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.projectUpsell.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findUpsellById(id: string) {
  return prisma.projectUpsell.findUnique({ where: { id }, select: upsellSelect });
}

// Upsells that can still be attached to a new invoice line item —
// approved/active, and for one-time mode not yet completed.
export async function findSelectableUpsellsByProject(projectId: string) {
  return prisma.projectUpsell.findMany({
    where: {
      projectId,
      status: { in: ["approved", "active"] },
    },
    select: upsellSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createUpsell(projectId: string, data: CreateUpsellInput, createdById: string | null) {
  return prisma.projectUpsell.create({
    data: {
      projectId,
      title: data.title,
      description: data.description ?? null,
      billingMode: data.billingMode,
      amountPkr: BigInt(Math.round(data.amountPkr * AMOUNT_MULTIPLIER)),
      earnerAccountId: data.earnerAccountId,
      commissionRatePct: data.commissionRatePct,
      managingPartnerId: data.managingPartnerId ?? null,
      managingCommissionRatePct: data.managingCommissionRatePct ?? 0,
      createdById,
      status: "pending",
    },
    select: upsellSelect,
  });
}

export async function updateUpsell(id: string, data: UpdateUpsellInput) {
  const updates: Prisma.ProjectUpsellUpdateInput = {};

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.billingMode !== undefined) updates.billingMode = data.billingMode;
  if (data.amountPkr !== undefined) updates.amountPkr = BigInt(Math.round(data.amountPkr * AMOUNT_MULTIPLIER));
  if (data.commissionRatePct !== undefined) updates.commissionRatePct = data.commissionRatePct;
  if (data.managingCommissionRatePct !== undefined) updates.managingCommissionRatePct = data.managingCommissionRatePct;
  if (data.earnerAccountId !== undefined) updates.earnerAccount = { connect: { id: data.earnerAccountId } };
  if (data.managingPartnerId !== undefined) {
    updates.managingPartner = data.managingPartnerId ? { connect: { id: data.managingPartnerId } } : { disconnect: true };
  }

  return prisma.projectUpsell.update({ where: { id }, data: updates, select: upsellSelect });
}

export async function deleteUpsell(id: string) {
  return prisma.projectUpsell.delete({ where: { id } });
}

export async function approveUpsell(id: string) {
  return prisma.projectUpsell.update({
    where: { id },
    data: {
      status: "approved",
      approvedAt: new Date(),
    },
    select: upsellSelect,
  });
}

export async function cancelUpsell(id: string) {
  return prisma.projectUpsell.update({
    where: { id },
    data: { status: "cancelled" },
    select: upsellSelect,
  });
}

export async function markUpsellCompleted(id: string) {
  return prisma.projectUpsell.update({
    where: { id },
    data: { status: "completed", completedAt: new Date() },
    select: upsellSelect,
  });
}

export async function markUpsellActive(id: string) {
  return prisma.projectUpsell.update({
    where: { id },
    data: { status: "active" },
    select: upsellSelect,
  });
}

export async function upsellExists(id: string): Promise<boolean> {
  return !!(await prisma.projectUpsell.findUnique({ where: { id }, select: { id: true } }));
}

export async function upsellHasCommissions(id: string): Promise<boolean> {
  const count = await prisma.commission.count({ where: { upsellId: id } });
  return count > 0;
}
