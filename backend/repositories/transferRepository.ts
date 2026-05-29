import { prisma } from "@backend/lib/prisma";
import type { CreateTransferInput } from "@backend/validators/transferValidator";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const transferSelect = {
  id: true,
  period: true,
  amountPkr: true,
  description: true,
  notes: true,
  status: true,
  reversalOfId: true,
  transferAt: true,
  createdAt: true,
  fromAccount: { select: { id: true, name: true, type: true } },
  toAccount:   { select: { id: true, name: true, type: true } },
  createdBy:   { select: { id: true, name: true } },
} as const;

export async function findAllTransfers(period?: string) {
  return prisma.accountTransfer.findMany({
    where: period ? { period } : undefined,
    select: transferSelect,
    orderBy: { transferAt: "desc" },
  });
}

export async function findTransferById(id: string) {
  return prisma.accountTransfer.findUnique({ where: { id }, select: transferSelect });
}

export async function createTransferTx(input: CreateTransferInput, createdById: string) {
  const transferDate = input.transferAt ? new Date(input.transferAt) : new Date();
  const period = `${transferDate.getFullYear()}-${String(transferDate.getMonth() + 1).padStart(2, "0")}`;
  const amountPkr = BigInt(input.amountPkr);

  return prisma.$transaction(async (tx) => {
    const [fromAcc, toAcc] = await Promise.all([
      tx.crmAccount.findUnique({ where: { id: input.fromAccountId }, select: { id: true, name: true, currentBalancePkr: true } }),
      tx.crmAccount.findUnique({ where: { id: input.toAccountId  }, select: { id: true, name: true } }),
    ]);

    if (!fromAcc) throw new Error("Source account not found");
    if (!toAcc)   throw new Error("Destination account not found");
    if (fromAcc.currentBalancePkr < amountPkr) {
      throw new Error(`Insufficient balance in ${fromAcc.name}. Available: PKR ${Number(fromAcc.currentBalancePkr) / 100}`);
    }

    await Promise.all([
      tx.crmAccount.update({ where: { id: input.fromAccountId }, data: { currentBalancePkr: { decrement: amountPkr } } }),
      tx.crmAccount.update({ where: { id: input.toAccountId   }, data: { currentBalancePkr: { increment: amountPkr } } }),
    ]);

    return tx.accountTransfer.create({
      data: {
        period,
        amountPkr,
        description: input.description,
        notes: input.notes ?? null,
        status: "completed",
        transferAt: transferDate,
        fromAccountId: input.fromAccountId,
        toAccountId:   input.toAccountId,
        createdById,
      },
      select: transferSelect,
    });
  });
}

export async function reverseTransferTx(id: string, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.accountTransfer.findUnique({
      where: { id },
      select: { amountPkr: true, fromAccountId: true, toAccountId: true, status: true, period: true, description: true },
    });
    if (!original) throw new Error("Transfer not found");
    if (original.status === "reversed") throw new Error("Transfer has already been reversed");

    // Restore balances (swap direction)
    await Promise.all([
      tx.crmAccount.update({ where: { id: original.fromAccountId }, data: { currentBalancePkr: { increment: original.amountPkr } } }),
      tx.crmAccount.update({ where: { id: original.toAccountId   }, data: { currentBalancePkr: { decrement: original.amountPkr } } }),
    ]);

    // Mark original as reversed
    await tx.accountTransfer.update({ where: { id }, data: { status: "reversed" } });

    // Create reversal record (swap from/to so it shows the money flowing back)
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return tx.accountTransfer.create({
      data: {
        period,
        amountPkr: original.amountPkr,
        description: `Reversal: ${original.description}`,
        notes: null,
        status: "completed",
        transferAt: now,
        fromAccountId: original.toAccountId,
        toAccountId:   original.fromAccountId,
        createdById,
        reversalOfId: id,
      },
      select: transferSelect,
    });
  });
}
