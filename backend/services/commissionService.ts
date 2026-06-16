import { prisma } from "@backend/lib/prisma";
import { COMMISSION_RATE_FIRST, COMMISSION_RATE_RECURRING, MANAGING_COMMISSION_RATE } from "@backend/lib/constants";
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

  // Check project commission exemption — also resolve managing partner
  const effectiveProjectId = projectId ?? (invoiceId
    ? (await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { projectId: true } }))?.projectId ?? null
    : null);

  let managingPartnerId: string | null = null;
  if (effectiveProjectId) {
    const project = await prisma.project.findUnique({
      where: { id: effectiveProjectId },
      select: { commissionExempt: true, managingPartnerId: true },
    });
    if (project?.commissionExempt) return;
    managingPartnerId = project?.managingPartnerId ?? null;
  }

  // Fetch configurable rates from settings, fall back to hardcoded constants
  const settings = await getAllSettings().catch(() => ({}));
  const s = settings as Record<string, unknown>;
  const ratePctFirst     = Number(s.commission_rate_first     ?? COMMISSION_RATE_FIRST);
  const ratePctRecurring = Number(s.commission_rate_recurring ?? COMMISSION_RATE_RECURRING);
  const managingRatePct  = Number(s.managing_commission_rate  ?? MANAGING_COMMISSION_RATE);

  // Apply prior-payments offset — existing clients added mid-lifecycle start at recurring rate
  const effectivePaymentNumber = paymentNumber + (client.commissionPriorPayments ?? 0);
  const ratePct = effectivePaymentNumber === 1 ? ratePctFirst : ratePctRecurring;
  const commissionPkr = BigInt(Math.round(Number(netPkr) * ratePct / 100));

  // Create partner commission
  await prisma.commission.create({
    data: {
      period,
      commissionType: "partner",
      paymentNumber,
      ratePct,
      baseAmountPkr: netPkr,
      commissionPkr,
      status: "pending",
      stakeholderAccountId: client.partnerId,
      clientId,
      projectId: effectiveProjectId ?? null,
      invoiceId: invoiceId ?? null,
      incomeRecordId,
    },
  });

  // Create managing commission if project has a managing partner
  if (managingPartnerId && managingRatePct > 0) {
    const managingCommissionPkr = BigInt(Math.round(Number(netPkr) * managingRatePct / 100));
    await prisma.commission.create({
      data: {
        period,
        commissionType: "managing",
        paymentNumber,
        ratePct: managingRatePct,
        baseAmountPkr: netPkr,
        commissionPkr: managingCommissionPkr,
        status: "pending",
        stakeholderAccountId: managingPartnerId,
        clientId,
        projectId: effectiveProjectId ?? null,
        invoiceId: invoiceId ?? null,
        incomeRecordId,
      },
    });
  }
}
