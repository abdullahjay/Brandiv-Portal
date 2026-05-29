import { prisma } from "@backend/lib/prisma";
import { COMMISSION_RATE_FIRST, COMMISSION_RATE_RECURRING } from "@backend/lib/constants";
import { getAllSettings } from "@backend/services/settingService";
import {
  findManyCommissions,
  findCommissionById,
  approveCommission,
  commissionExists,
  getCommissionSummary,
} from "@backend/repositories/commissionRepository";
import type { ListCommissionsInput } from "@backend/validators/commissionValidator";

export async function listCommissions(input: ListCommissionsInput) {
  return findManyCommissions(input);
}

export async function getCommission(id: string) {
  return findCommissionById(id);
}

export async function approveCommissionById(id: string) {
  const commission = await findCommissionById(id);
  if (!commission) return null;
  if (commission.status !== "pending") {
    throw new Error("Only pending commissions can be approved");
  }
  return approveCommission(id);
}

export async function getCommissionStats() {
  return getCommissionSummary();
}

interface TriggerCommissionArgs {
  incomeRecordId: string;
  clientId: string;
  projectId?: string | null;
  invoiceId?: string | null;
  netPkr: bigint;
  paymentNumber: number;
  period: string;
}

export async function triggerCommission(args: TriggerCommissionArgs): Promise<void> {
  const { incomeRecordId, clientId, projectId, invoiceId, netPkr, paymentNumber, period } = args;

  // Load client commission rule, partner, and prior-payments offset
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { commissionRule: true, partnerId: true, commissionPriorPayments: true },
  });

  if (!client || client.commissionRule === "none" || !client.partnerId) return;

  // Check project commission exemption — also fall back to invoice's project if projectId not passed directly
  const effectiveProjectId = projectId ?? (invoiceId
    ? (await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { projectId: true } }))?.projectId ?? null
    : null);

  if (effectiveProjectId) {
    const project = await prisma.project.findUnique({
      where: { id: effectiveProjectId },
      select: { commissionExempt: true },
    });
    if (project?.commissionExempt) return;
  }

  // Fetch configurable rates from settings, fall back to hardcoded constants
  const settings = await getAllSettings().catch(() => ({}));
  const ratePctFirst = Number((settings as Record<string, unknown>).commission_rate_first ?? COMMISSION_RATE_FIRST);
  const ratePctRecurring = Number((settings as Record<string, unknown>).commission_rate_recurring ?? COMMISSION_RATE_RECURRING);

  // Apply prior-payments offset — existing clients added mid-lifecycle start at recurring rate
  const effectivePaymentNumber = paymentNumber + (client.commissionPriorPayments ?? 0);
  const ratePct = effectivePaymentNumber === 1 ? ratePctFirst : ratePctRecurring;
  const commissionPkr = BigInt(Math.round(Number(netPkr) * ratePct / 100));

  await prisma.commission.create({
    data: {
      period,
      paymentNumber,
      ratePct,
      baseAmountPkr: netPkr,
      commissionPkr,
      status: "pending",
      stakeholderAccountId: client.partnerId,
      clientId,
      projectId: projectId ?? null,
      invoiceId: invoiceId ?? null,
      incomeRecordId,
    },
  });
}
