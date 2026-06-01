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
  accountType: "stakeholder" | "company_reserve";
  sharePct: number;
  shareBasis: "total" | "pool"; // total = % of operating balance, pool = % of stakeholder pool
  distributionAmountPkr: number;
  commissionAmountPkr: number;
  totalPkr: number;
}

export interface DistributionPreview {
  operatingBalancePkr: number;
  totalCommissionPkr: number;
  companyReservePct: number;
  companyReservePoolPkr: number;
  stakeholderPoolPkr: number;
  stakeholderRemainderPkr: number;
  totalStakeholderPct: number;
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
  const [operatingAccount, allAccounts, commissionAgg] = await Promise.all([
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
      orderBy: [{ type: "asc" }, { sharePct: "desc" }],
    }),
    prisma.commission.aggregate({
      where: { status: "approved" },
      _sum: { commissionPkr: true },
    }),
  ]);

  const operatingBalancePkr = operatingAccount?.currentBalancePkr ?? BigInt(0);
  const totalCommissionPkr = commissionAgg._sum.commissionPkr ?? BigInt(0);

  const companyReserveAccounts = allAccounts.filter((a) => a.type === "company_reserve");
  const stakeholderAccounts = allAccounts.filter((a) => a.type === "stakeholder");

  const warnings: string[] = [];
  if (!operatingAccount) warnings.push("No default operating account found.");
  if (operatingBalancePkr <= BigInt(0)) {
    warnings.push("Operating account balance is zero or negative — nothing to distribute.");
  }
  if (allAccounts.length === 0) {
    warnings.push("No stakeholder or company reserve accounts configured — add them before running distribution.");
  }

  // ── Tier 1: Company reserve cut (% of total operating balance) ───────────────
  const companyReservePct = companyReserveAccounts.reduce((s, a) => s + Number(a.sharePct ?? 0), 0);
  if (companyReservePct >= 100) {
    warnings.push(`Company reserve accounts total ${companyReservePct.toFixed(2)}% — must be less than 100% to leave a pool for stakeholders.`);
  }

  const companyReserveAmounts = new Map<string, bigint>();
  let companyReserveCutPkr = BigInt(0);
  for (const account of companyReserveAccounts) {
    const amount = BigInt(Math.round(Number(operatingBalancePkr) * Number(account.sharePct ?? 0) / 100));
    companyReserveAmounts.set(account.id, amount);
    companyReserveCutPkr += amount;
  }

  // ── Tier 2: Stakeholder pool = operating balance minus company reserve cut ───
  const stakeholderPoolPkr = operatingBalancePkr - companyReserveCutPkr;

  const totalStakeholderPct = stakeholderAccounts.reduce((s, a) => s + Number(a.sharePct ?? 0), 0);
  if (stakeholderAccounts.length > 0 && totalStakeholderPct > 100) {
    warnings.push(`Stakeholder share percentages total ${totalStakeholderPct.toFixed(2)}% — must not exceed 100%.`);
  }

  const stakeholderAmounts = new Map<string, bigint>();
  let stakeholderTotalPkr = BigInt(0);
  for (const account of stakeholderAccounts) {
    const amount = BigInt(Math.round(Number(stakeholderPoolPkr) * Number(account.sharePct ?? 0) / 100));
    stakeholderAmounts.set(account.id, amount);
    stakeholderTotalPkr += amount;
  }

  // Rounding remainder from stakeholder distribution → first company reserve account
  const remainder = stakeholderPoolPkr - stakeholderTotalPkr;
  if (remainder !== BigInt(0) && companyReserveAccounts.length > 0) {
    const first = companyReserveAccounts[0];
    companyReserveAmounts.set(first.id, (companyReserveAmounts.get(first.id) ?? BigInt(0)) + remainder);
  }

  const companyReservePoolPkr = companyReserveCutPkr + (remainder > BigInt(0) ? remainder : BigInt(0));

  // Per-account approved commissions (stakeholders only)
  const commRows = await prisma.commission.groupBy({
    by: ["stakeholderAccountId"],
    where: { status: "approved" },
    _sum: { commissionPkr: true },
  });
  const commByAccount = new Map<string, bigint>();
  for (const r of commRows) {
    commByAccount.set(r.stakeholderAccountId, r._sum.commissionPkr ?? BigInt(0));
  }

  // Build items — company reserve first, then stakeholders
  const items: DistributionPreviewItem[] = [
    ...companyReserveAccounts.map((account) => {
      const distributionAmountPkr = companyReserveAmounts.get(account.id) ?? BigInt(0);
      return {
        accountId: account.id,
        accountName: account.name,
        ownerName: account.ownerUser?.name ?? null,
        accountType: "company_reserve" as const,
        sharePct: Number(account.sharePct ?? 0),
        shareBasis: "total" as const,
        distributionAmountPkr: Number(distributionAmountPkr),
        commissionAmountPkr: 0,
        totalPkr: Number(distributionAmountPkr),
      };
    }),
    ...stakeholderAccounts.map((account) => {
      const distributionAmountPkr = stakeholderAmounts.get(account.id) ?? BigInt(0);
      const commissionAmountPkr = commByAccount.get(account.id) ?? BigInt(0);
      const totalPkr = distributionAmountPkr + commissionAmountPkr;
      return {
        accountId: account.id,
        accountName: account.name,
        ownerName: account.ownerUser?.name ?? null,
        accountType: "stakeholder" as const,
        sharePct: Number(account.sharePct ?? 0),
        shareBasis: "pool" as const,
        distributionAmountPkr: Number(distributionAmountPkr),
        commissionAmountPkr: Number(commissionAmountPkr),
        totalPkr: Number(totalPkr),
      };
    }),
  ];

  return {
    operatingBalancePkr: Number(operatingBalancePkr),
    totalCommissionPkr: Number(totalCommissionPkr),
    companyReservePct,
    companyReservePoolPkr: Number(companyReservePoolPkr),
    stakeholderPoolPkr: Number(stakeholderPoolPkr),
    stakeholderRemainderPkr: Number(remainder > BigInt(0) ? remainder : BigInt(0)),
    totalStakeholderPct,
    totalSharePct: companyReservePct + totalStakeholderPct,
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

    const [commissionAgg, allAccounts] = await Promise.all([
      tx.commission.aggregate({ where: { status: "approved" }, _sum: { commissionPkr: true } }),
      tx.crmAccount.findMany({
        where: { type: { in: ["stakeholder", "company_reserve"] } },
        select: { id: true, type: true, sharePct: true, name: true },
        orderBy: [{ type: "asc" }, { sharePct: "desc" }],
      }),
    ]);

    if (allAccounts.length === 0) {
      throw new Error("No distribution accounts configured — add stakeholder or company reserve accounts first");
    }

    const companyReserveAccounts = allAccounts.filter((a) => a.type === "company_reserve");
    const stakeholderAccounts = allAccounts.filter((a) => a.type === "stakeholder");

    // Tier 1: Company reserve cut
    const companyReservePct = companyReserveAccounts.reduce((s, a) => s + Number(a.sharePct ?? 0), 0);
    if (companyReservePct >= 100) {
      throw new Error(`Company reserve accounts total ${companyReservePct.toFixed(2)}% — must be less than 100%`);
    }

    const companyReserveAmounts = new Map<string, bigint>();
    let companyReserveCutPkr = BigInt(0);
    for (const account of companyReserveAccounts) {
      const amount = BigInt(Math.round(Number(operatingBalancePkr) * Number(account.sharePct ?? 0) / 100));
      companyReserveAmounts.set(account.id, amount);
      companyReserveCutPkr += amount;
    }

    // Tier 2: Stakeholder pool
    const stakeholderPoolPkr = operatingBalancePkr - companyReserveCutPkr;

    const totalStakeholderPct = stakeholderAccounts.reduce((s, a) => s + Number(a.sharePct ?? 0), 0);
    if (totalStakeholderPct > 100) {
      throw new Error(`Stakeholder share percentages total ${totalStakeholderPct.toFixed(2)}% — must not exceed 100%`);
    }

    const stakeholderAmounts = new Map<string, bigint>();
    let stakeholderTotalPkr = BigInt(0);
    for (const account of stakeholderAccounts) {
      const amount = BigInt(Math.round(Number(stakeholderPoolPkr) * Number(account.sharePct ?? 0) / 100));
      stakeholderAmounts.set(account.id, amount);
      stakeholderTotalPkr += amount;
    }

    // Remainder → first company reserve account
    const remainder = stakeholderPoolPkr - stakeholderTotalPkr;
    if (remainder !== BigInt(0) && companyReserveAccounts.length > 0) {
      const first = companyReserveAccounts[0];
      companyReserveAmounts.set(first.id, (companyReserveAmounts.get(first.id) ?? BigInt(0)) + remainder);
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

    // Credit company reserve accounts
    for (const account of companyReserveAccounts) {
      const distributionAmountPkr = companyReserveAmounts.get(account.id) ?? BigInt(0);
      totalDistributedPkr += distributionAmountPkr;

      await tx.distributionItem.create({
        data: {
          distributionId: distribution.id,
          accountId: account.id,
          sharePct: account.sharePct,
          distributionAmountPkr,
          commissionAmountPkr: BigInt(0),
          totalPkr: distributionAmountPkr,
        },
      });

      await tx.crmAccount.update({
        where: { id: account.id },
        data: {
          currentBalancePkr: { increment: distributionAmountPkr },
          lifetimeDistPkr: { increment: distributionAmountPkr },
        },
      });
    }

    // Credit stakeholder accounts
    for (const account of stakeholderAccounts) {
      const distributionAmountPkr = stakeholderAmounts.get(account.id) ?? BigInt(0);
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

    // Mark all approved commissions as paid
    await tx.commission.updateMany({
      where: { status: "approved" },
      data: { status: "paid", paidInDistributionId: distribution.id },
    });

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
