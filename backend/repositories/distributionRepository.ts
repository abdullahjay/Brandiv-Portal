import { prisma } from "@backend/lib/prisma";
import type { RunDistributionInput } from "@backend/validators/distributionValidator";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DistributionPreviewItem {
  accountId: string;
  accountName: string;
  ownerName: string | null;
  sharePct: number;
  distributionAmountPkr: number; // paise × 100
  commissionAmountPkr: number;   // paise × 100
  totalPkr: number;              // paise × 100
}

export interface DistributionPreview {
  operatingBalancePkr: number;   // actual account balance (paise × 100)
  totalCommissionPkr: number;    // all approved commissions (paise × 100)
  totalSharePct: number;
  items: DistributionPreviewItem[];
  warnings: string[];
}

// ─── Select shape ─────────────────────────────────────────────────────────────

const distributionSelect = {
  id: true,
  period: true,
  label: true,
  operatingBalancePkr: true,
  totalCommissionPkr: true,
  totalDistributedPkr: true,
  operatingBalanceAfter: true,
  runAt: true,
  notes: true,
  runBy: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      sharePct: true,
      distributionAmountPkr: true,
      commissionAmountPkr: true,
      totalPkr: true,
      account: { select: { id: true, name: true, type: true } },
    },
  },
} as const;

// ─── Preview (no side effects) ────────────────────────────────────────────────

export async function previewDistribution(): Promise<DistributionPreview> {
  const [operatingAccount, stakeholderAccounts, commissionAgg] = await Promise.all([
    prisma.crmAccount.findFirst({
      where: { type: "operating", isDefaultOperating: true },
      select: { id: true, name: true, currentBalancePkr: true },
    }),
    prisma.crmAccount.findMany({
      where: { type: { in: ["stakeholder", "company_reserve"] } },
      select: {
        id: true,
        name: true,
        type: true,
        sharePct: true,
        ownerUserId: true,
        ownerUser: { select: { id: true, name: true } },
      },
      orderBy: { sharePct: "desc" },
    }),
    prisma.commission.aggregate({
      where: { status: "approved" },
      _sum: { commissionPkr: true },
    }),
  ]);

  const operatingBalancePkr = operatingAccount?.currentBalancePkr ?? BigInt(0);
  const totalCommissionPkr = commissionAgg._sum.commissionPkr ?? BigInt(0);

  const warnings: string[] = [];
  if (!operatingAccount) warnings.push("No default operating account found.");
  if (operatingBalancePkr <= BigInt(0)) {
    warnings.push("Operating account balance is zero or negative — nothing to distribute.");
  }
  if (stakeholderAccounts.length === 0) {
    warnings.push("No stakeholder or company reserve accounts configured — add them before running distribution.");
  }

  const totalSharePct = stakeholderAccounts.reduce((s, a) => s + Number(a.sharePct), 0);
  if (stakeholderAccounts.length > 0 && Math.round(totalSharePct) !== 100) {
    warnings.push(`Share percentages total ${totalSharePct.toFixed(2)}% — must equal 100%.`);
  }

  // Per-account approved commissions
  const commRows = await prisma.commission.groupBy({
    by: ["stakeholderAccountId"],
    where: { status: "approved" },
    _sum: { commissionPkr: true },
  });
  const commByAccount = new Map<string, bigint>();
  for (const r of commRows) {
    commByAccount.set(r.stakeholderAccountId, r._sum.commissionPkr ?? BigInt(0));
  }

  const items: DistributionPreviewItem[] = stakeholderAccounts.map((account) => {
    const sharePct = Number(account.sharePct);
    const distributionAmountPkr = BigInt(Math.round(Number(operatingBalancePkr) * sharePct / 100));
    const commissionAmountPkr = commByAccount.get(account.id) ?? BigInt(0);
    const totalPkr = distributionAmountPkr + commissionAmountPkr;
    return {
      accountId: account.id,
      accountName: account.name,
      ownerName: account.ownerUser?.name ?? null,
      sharePct,
      distributionAmountPkr: Number(distributionAmountPkr),
      commissionAmountPkr: Number(commissionAmountPkr),
      totalPkr: Number(totalPkr),
    };
  });

  return {
    operatingBalancePkr: Number(operatingBalancePkr),
    totalCommissionPkr: Number(totalCommissionPkr),
    totalSharePct,
    items,
    warnings,
  };
}

// ─── Run (atomic) ─────────────────────────────────────────────────────────────

export async function runDistributionTx(input: RunDistributionInput, runById: string) {
  const period = currentPeriod();

  return prisma.$transaction(async (tx) => {
    const operatingAccount = await tx.crmAccount.findFirst({
      where: { type: "operating", isDefaultOperating: true },
      select: { id: true, currentBalancePkr: true },
    });

    if (!operatingAccount) throw new Error("No default operating account found");
    if (operatingAccount.currentBalancePkr <= BigInt(0)) {
      throw new Error("Operating account balance is zero or negative — cannot run distribution");
    }

    const operatingBalancePkr = operatingAccount.currentBalancePkr;

    const [commissionAgg, stakeholderAccounts] = await Promise.all([
      tx.commission.aggregate({ where: { status: "approved" }, _sum: { commissionPkr: true } }),
      tx.crmAccount.findMany({
        where: { type: { in: ["stakeholder", "company_reserve"] } },
        select: { id: true, type: true, sharePct: true, name: true },
      }),
    ]);

    if (stakeholderAccounts.length === 0) {
      throw new Error("No distribution accounts configured — add stakeholder or company accounts with a share %");
    }

    const totalSharePct = stakeholderAccounts.reduce((s, a) => s + Number(a.sharePct), 0);
    if (Math.round(totalSharePct) !== 100) {
      throw new Error(`Share percentages total ${totalSharePct.toFixed(2)}% — must equal 100%`);
    }

    const totalCommissionPkr = commissionAgg._sum.commissionPkr ?? BigInt(0);

    const commRows = await tx.commission.groupBy({
      by: ["stakeholderAccountId"],
      where: { status: "approved" },
      _sum: { commissionPkr: true },
    });
    const commByAccount = new Map<string, bigint>();
    for (const r of commRows) {
      commByAccount.set(r.stakeholderAccountId, r._sum.commissionPkr ?? BigInt(0));
    }

    // Create distribution record
    const distribution = await tx.distribution.create({
      data: {
        period,
        label: input.label ?? null,
        operatingBalancePkr,
        totalCommissionPkr,
        totalDistributedPkr: BigInt(0),
        operatingBalanceAfter: BigInt(0),
        notes: input.notes ?? null,
        runById,
      },
    });

    let totalDistributedPkr = BigInt(0);

    for (const account of stakeholderAccounts) {
      const sharePct = Number(account.sharePct);
      const distributionAmountPkr = BigInt(Math.round(Number(operatingBalancePkr) * sharePct / 100));
      const commissionAmountPkr = commByAccount.get(account.id) ?? BigInt(0);
      const totalPkr = distributionAmountPkr + commissionAmountPkr;
      totalDistributedPkr += totalPkr;

      await tx.distributionItem.create({
        data: {
          distributionId: distribution.id,
          accountId: account.id,
          sharePct: account.sharePct,
          distributionAmountPkr,
          commissionAmountPkr,
          totalPkr,
        },
      });

      await tx.crmAccount.update({
        where: { id: account.id },
        data: {
          currentBalancePkr: { increment: totalPkr },
          lifetimeDistPkr: { increment: distributionAmountPkr },
          lifetimeCommPkr: { increment: commissionAmountPkr },
        },
      });
    }

    // Zero out operating account
    await tx.crmAccount.update({
      where: { id: operatingAccount.id },
      data: { currentBalancePkr: BigInt(0) },
    });

    // Mark ALL approved commissions as paid
    await tx.commission.updateMany({
      where: { status: "approved" },
      data: { status: "paid", paidInDistributionId: distribution.id },
    });

    // Update totals
    await tx.distribution.update({
      where: { id: distribution.id },
      data: { totalDistributedPkr, operatingBalanceAfter: BigInt(0) },
    });

    return tx.distribution.findUnique({
      where: { id: distribution.id },
      select: distributionSelect,
    });
  });
}

// ─── List past distributions ──────────────────────────────────────────────────

export async function findManyDistributions() {
  return prisma.distribution.findMany({
    select: distributionSelect,
    orderBy: { runAt: "desc" },
  });
}
