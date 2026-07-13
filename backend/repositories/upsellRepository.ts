import { prisma } from "@backend/lib/prisma";
import type { UpsellSource, UpsellStatus } from "@prisma/client";

export interface CreateUpsellInput {
  projectId: string;
  source: UpsellSource;
  incrementPkr: bigint;
  ratePct: number;
  period: string;
  earnerAccountId: string;
  description?: string;
}

export interface UpdateUpsellInput {
  source?: UpsellSource;
  incrementPkr?: bigint;
  ratePct?: number;
  period?: string;
  earnerAccountId?: string;
  description?: string;
}

export async function listUpsellsByProject(projectId: string) {
  return prisma.projectUpsell.findMany({
    where: { projectId },
    include: {
      earnerAccount: { select: { id: true, name: true, type: true } },
      commissions:   { select: { id: true, status: true, commissionPkr: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUpsell(id: string) {
  return prisma.projectUpsell.findUnique({
    where: { id },
    include: {
      project:       { select: { id: true, name: true, clientId: true } },
      earnerAccount: { select: { id: true, name: true, type: true } },
      commissions:   { select: { id: true, status: true, commissionPkr: true } },
    },
  });
}

export async function createUpsell(data: CreateUpsellInput) {
  return prisma.projectUpsell.create({
    data: {
      projectId:       data.projectId,
      source:          data.source,
      incrementPkr:    data.incrementPkr,
      ratePct:         data.ratePct,
      period:          data.period,
      earnerAccountId: data.earnerAccountId,
      description:     data.description,
    },
    include: {
      earnerAccount: { select: { id: true, name: true } },
    },
  });
}

export async function updateUpsell(id: string, data: UpdateUpsellInput) {
  return prisma.projectUpsell.update({
    where: { id },
    data: {
      ...(data.source          !== undefined && { source: data.source }),
      ...(data.incrementPkr    !== undefined && { incrementPkr: data.incrementPkr }),
      ...(data.ratePct         !== undefined && { ratePct: data.ratePct }),
      ...(data.period          !== undefined && { period: data.period }),
      ...(data.earnerAccountId !== undefined && { earnerAccountId: data.earnerAccountId }),
      ...(data.description     !== undefined && { description: data.description }),
    },
    include: {
      earnerAccount: { select: { id: true, name: true } },
    },
  });
}

export async function deleteUpsell(id: string) {
  return prisma.projectUpsell.delete({ where: { id } });
}

// Approve: atomically set upsell status = approved + create Commission record
export async function approveUpsell(id: string) {
  return prisma.$transaction(async (tx) => {
    const upsell = await tx.projectUpsell.findUniqueOrThrow({
      where: { id },
      include: {
        project: { select: { id: true, clientId: true } },
      },
    });

    if (upsell.status !== "pending") {
      throw new Error(`Upsell is already ${upsell.status}`);
    }

    const commissionPkr = (upsell.incrementPkr * BigInt(Math.round(Number(upsell.ratePct) * 100))) / BigInt(10000);

    // Count existing commissions for this project + earner to get paymentNumber
    const existingCount = await tx.commission.count({
      where: { projectId: upsell.projectId, stakeholderAccountId: upsell.earnerAccountId },
    });

    const commission = await tx.commission.create({
      data: {
        period:              upsell.period,
        commissionType:      "upsell",
        paymentNumber:       existingCount + 1,
        ratePct:             upsell.ratePct,
        baseAmountPkr:       upsell.incrementPkr,
        commissionPkr,
        status:              "approved",
        stakeholderAccountId: upsell.earnerAccountId,
        clientId:            upsell.project.clientId,
        projectId:           upsell.project.id,
        upsellId:            id,
      },
    });

    const updated = await tx.projectUpsell.update({
      where: { id },
      data:  { status: "approved" },
      include: {
        earnerAccount: { select: { id: true, name: true } },
        commissions:   { select: { id: true, status: true, commissionPkr: true } },
      },
    });

    return { upsell: updated, commission };
  });
}
