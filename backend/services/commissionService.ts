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

interface UpsellGroup {
  upsellId: string;
  title: string;
  billingMode: string;
  status: string;
  earnerAccountId: string;
  commissionRatePct: number;
  managingPartnerId: string | null;
  managingCommissionRatePct: number;
  lineAmount: bigint;
}

// Splits an invoice's line items into a base (non-upsell) amount and one group
// per linked upsell. Ratios are computed from line-item amounts (in the
// invoice's own currency) so they carry over correctly to netPkr regardless
// of currency — the ratio is currency-invariant.
async function splitInvoiceLines(invoiceId: string): Promise<{ baseLineAmount: bigint; totalLineAmount: bigint; groups: UpsellGroup[] }> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      lineItems: {
        select: {
          amount: true,
          upsellId: true,
          upsell: {
            select: {
              id: true,
              title: true,
              billingMode: true,
              status: true,
              earnerAccountId: true,
              commissionRatePct: true,
              managingPartnerId: true,
              managingCommissionRatePct: true,
            },
          },
        },
      },
    },
  });

  const groupsByUpsell = new Map<string, UpsellGroup>();
  let baseLineAmount = BigInt(0);
  let totalLineAmount = BigInt(0);

  for (const li of invoice?.lineItems ?? []) {
    totalLineAmount += li.amount;
    if (li.upsellId && li.upsell) {
      const existing = groupsByUpsell.get(li.upsellId);
      if (existing) {
        existing.lineAmount += li.amount;
      } else {
        groupsByUpsell.set(li.upsellId, {
          upsellId: li.upsell.id,
          title: li.upsell.title,
          billingMode: li.upsell.billingMode,
          status: li.upsell.status,
          earnerAccountId: li.upsell.earnerAccountId,
          commissionRatePct: Number(li.upsell.commissionRatePct),
          managingPartnerId: li.upsell.managingPartnerId,
          managingCommissionRatePct: Number(li.upsell.managingCommissionRatePct),
          lineAmount: li.amount,
        });
      }
    } else {
      baseLineAmount += li.amount;
    }
  }

  return { baseLineAmount, totalLineAmount, groups: [...groupsByUpsell.values()] };
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

  // Split this payment's netPkr between base (non-upsell) revenue and each
  // linked upsell's revenue, proportional to their share of the invoice's line
  // items. If there's no invoice, or no upsell-linked lines, everything is base.
  let baseNetPkr = netPkr;
  let upsellShares: { group: UpsellGroup; netShare: bigint }[] = [];

  if (invoiceId) {
    const { baseLineAmount, totalLineAmount, groups } = await splitInvoiceLines(invoiceId);
    if (totalLineAmount > BigInt(0) && groups.length > 0) {
      upsellShares = groups.map((group) => ({
        group,
        netShare: BigInt(Math.round(Number(netPkr) * Number(group.lineAmount) / Number(totalLineAmount))),
      }));
      const upsellNetSum = upsellShares.reduce((sum, u) => sum + u.netShare, BigInt(0));
      // Base gets the remainder so rounding never loses/creates money.
      baseNetPkr = netPkr - upsellNetSum;
      void baseLineAmount; // only used for the ratio above
    }
  }

  // Apply prior-payments offset — existing clients added mid-lifecycle start at recurring rate
  const effectivePaymentNumber = paymentNumber + (client.commissionPriorPayments ?? 0);
  const ratePct = effectivePaymentNumber === 1 ? ratePctFirst : ratePctRecurring;

  await prisma.$transaction(async (tx) => {
    // Partner commission — base amount only
    if (baseNetPkr > BigInt(0)) {
      const commissionPkr = BigInt(Math.round(Number(baseNetPkr) * ratePct / 100));
      await tx.commission.create({
        data: {
          period,
          commissionType: "partner",
          paymentNumber,
          ratePct,
          baseAmountPkr: baseNetPkr,
          commissionPkr,
          status: "pending",
          stakeholderAccountId: client.partnerId!,
          clientId,
          projectId: effectiveProjectId ?? null,
          invoiceId: invoiceId ?? null,
          incomeRecordId,
        },
      });

      // Managing commission — base amount only, if project has a managing partner
      if (managingPartnerId && managingRatePct > 0) {
        const managingCommissionPkr = BigInt(Math.round(Number(baseNetPkr) * managingRatePct / 100));
        await tx.commission.create({
          data: {
            period,
            commissionType: "managing",
            paymentNumber,
            ratePct: managingRatePct,
            baseAmountPkr: baseNetPkr,
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

    // Upsell + upsell-managing commissions, one group per linked upsell
    for (const { group, netShare } of upsellShares) {
      if (netShare <= BigInt(0)) continue;

      const upsellCommissionPkr = BigInt(Math.round(Number(netShare) * group.commissionRatePct / 100));
      await tx.commission.create({
        data: {
          period,
          commissionType: "upsell",
          paymentNumber,
          ratePct: group.commissionRatePct,
          baseAmountPkr: netShare,
          commissionPkr: upsellCommissionPkr,
          status: "pending",
          stakeholderAccountId: group.earnerAccountId,
          clientId,
          projectId: effectiveProjectId ?? null,
          invoiceId: invoiceId ?? null,
          incomeRecordId,
          upsellId: group.upsellId,
        },
      });

      if (group.managingPartnerId && group.managingCommissionRatePct > 0) {
        const upsellManagingCommissionPkr = BigInt(Math.round(Number(netShare) * group.managingCommissionRatePct / 100));
        await tx.commission.create({
          data: {
            period,
            commissionType: "upsell_managing",
            paymentNumber,
            ratePct: group.managingCommissionRatePct,
            baseAmountPkr: netShare,
            commissionPkr: upsellManagingCommissionPkr,
            status: "pending",
            stakeholderAccountId: group.managingPartnerId,
            clientId,
            projectId: effectiveProjectId ?? null,
            invoiceId: invoiceId ?? null,
            incomeRecordId,
            upsellId: group.upsellId,
          },
        });
      }

      // One-time upsells complete after their commission is created; recurring
      // upsells stay active so they can be invoiced again next cycle.
      if (group.billingMode === "one_time" && group.status !== "completed") {
        await tx.projectUpsell.update({
          where: { id: group.upsellId },
          data: { status: "completed", completedAt: new Date() },
        });
      }
    }
  });
}
