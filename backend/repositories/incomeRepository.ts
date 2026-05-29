import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";
import type { CreateIncomeInput, UpdateIncomeInput, ListIncomeInput } from "@backend/validators/incomeValidator";
import type { Prisma } from "@prisma/client";

const listSelect = {
  id: true,
  period: true,
  originalAmount: true,
  originalCurrency: true,
  exchangeRate: true,
  grossPkr: true,
  whtPct: true,
  whtAmountPkr: true,
  gstPct: true,
  gstAmountPkr: true,
  bankChargesPkr: true,
  netPkr: true,
  paymentMethod: true,
  transactionRef: true,
  receivedAt: true,
  status: true,
  incomeType: true,
  createdAt: true,
  client: { select: { id: true, companyName: true, currency: true } },
  invoice: { select: { id: true, invoiceNumber: true } },
} satisfies Prisma.IncomeRecordSelect;

const detailSelect = {
  ...listSelect,
  rateSource: true,
  notes: true,
  destinationAccount: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  commissions: {
    select: {
      id: true,
      ratePct: true,
      baseAmountPkr: true,
      commissionPkr: true,
      status: true,
      paymentNumber: true,
      stakeholderAccount: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.IncomeRecordSelect;

export interface CalculatedIncomeFields {
  grossPkr: bigint;
  whtAmountPkr: bigint;
  gstAmountPkr: bigint;
  bankChargesPkrBigInt: bigint;
  netPkr: bigint;
  period: string;
}

export function calculateIncomeFields(input: CreateIncomeInput): CalculatedIncomeFields {
  const originalAmountBigInt = BigInt(Math.round(input.originalAmount * AMOUNT_MULTIPLIER));
  const rateScaled = Math.round(Number(input.exchangeRate) * 10000);
  const grossPkr = (originalAmountBigInt * BigInt(rateScaled)) / BigInt(10000);

  const whtAmountPkr = BigInt(Math.round(Number(grossPkr) * Number(input.whtPct) / 100));
  const gstAmountPkr = BigInt(Math.round(Number(grossPkr) * Number(input.gstPct) / 100));
  const bankChargesPkrBigInt = BigInt(Math.round((input.bankChargesPkr ?? 0) * AMOUNT_MULTIPLIER));
  const netPkr = grossPkr - whtAmountPkr - gstAmountPkr - bankChargesPkrBigInt;

  const receivedDate = new Date(input.receivedAt);
  const period = `${receivedDate.getFullYear()}-${String(receivedDate.getMonth() + 1).padStart(2, "0")}`;

  return { grossPkr, whtAmountPkr, gstAmountPkr, bankChargesPkrBigInt, netPkr, period };
}

export async function findManyIncome(input: ListIncomeInput) {
  const { status, clientId, period, search, page, pageSize } = input;

  const where: Prisma.IncomeRecordWhereInput = {
    ...(status !== "all" && { status }),
    ...(clientId && { clientId }),
    ...(period && { period }),
    ...(search && {
      OR: [
        { client: { companyName: { contains: search, mode: "insensitive" } } },
        { invoice: { invoiceNumber: { contains: search, mode: "insensitive" } } },
        { transactionRef: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total, agg] = await Promise.all([
    prisma.incomeRecord.findMany({
      where,
      select: listSelect,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.incomeRecord.count({ where }),
    prisma.incomeRecord.aggregate({
      where,
      _sum: { grossPkr: true, whtAmountPkr: true, gstAmountPkr: true, bankChargesPkr: true, netPkr: true },
    }),
  ]);

  const totals = {
    grossPkr:      Number(agg._sum.grossPkr      ?? 0),
    whtAmountPkr:  Number(agg._sum.whtAmountPkr  ?? 0),
    gstAmountPkr:  Number(agg._sum.gstAmountPkr  ?? 0),
    bankChargesPkr: Number(agg._sum.bankChargesPkr ?? 0),
    netPkr:        Number(agg._sum.netPkr         ?? 0),
  };

  return { items, total, page, pageSize, totals };
}

export async function findIncomeById(id: string) {
  return prisma.incomeRecord.findUnique({ where: { id }, select: detailSelect });
}

export async function createIncomeRecord(
  input: CreateIncomeInput,
  calc: CalculatedIncomeFields,
  createdById: string
) {
  return prisma.incomeRecord.create({
    data: {
      clientId: input.clientId,
      invoiceId: input.invoiceId ?? null,
      destinationAccountId: input.destinationAccountId ?? null,
      createdById,
      period: calc.period,
      originalAmount: BigInt(Math.round(input.originalAmount * AMOUNT_MULTIPLIER)),
      originalCurrency: input.originalCurrency,
      exchangeRate: input.exchangeRate,
      rateSource: input.rateSource ?? null,
      grossPkr: calc.grossPkr,
      whtPct: input.whtPct ?? 0,
      whtAmountPkr: calc.whtAmountPkr,
      gstPct: input.gstPct ?? 0,
      gstAmountPkr: calc.gstAmountPkr,
      bankChargesPkr: calc.bankChargesPkrBigInt,
      netPkr: calc.netPkr,
      paymentMethod: input.paymentMethod ?? null,
      transactionRef: input.transactionRef ?? null,
      receivedAt: new Date(input.receivedAt),
      incomeType: input.incomeType ?? null,
      notes: input.notes ?? null,
      status: "pending",
    },
    select: detailSelect,
  });
}

export async function updateIncomeRecord(id: string, input: UpdateIncomeInput) {
  const updates: Prisma.IncomeRecordUpdateInput = {};

  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.paymentMethod !== undefined) updates.paymentMethod = input.paymentMethod;
  if (input.transactionRef !== undefined) updates.transactionRef = input.transactionRef;
  if (input.rateSource !== undefined) updates.rateSource = input.rateSource;
  if (input.incomeType !== undefined) updates.incomeType = input.incomeType;
  if (input.destinationAccountId !== undefined) {
    updates.destinationAccount = input.destinationAccountId
      ? { connect: { id: input.destinationAccountId } }
      : { disconnect: true };
  }

  // If financial fields change, recalculate
  const needsRecalc =
    input.originalAmount !== undefined ||
    input.exchangeRate !== undefined ||
    input.whtPct !== undefined ||
    input.gstPct !== undefined ||
    input.bankChargesPkr !== undefined;

  if (needsRecalc) {
    const current = await prisma.incomeRecord.findUnique({
      where: { id },
      select: {
        originalAmount: true,
        originalCurrency: true,
        exchangeRate: true,
        whtPct: true,
        gstPct: true,
        bankChargesPkr: true,
        receivedAt: true,
      },
    });
    if (current) {
      const merged = {
        originalAmount: input.originalAmount ?? Number(current.originalAmount) / AMOUNT_MULTIPLIER,
        originalCurrency: input.originalCurrency ?? current.originalCurrency,
        exchangeRate: input.exchangeRate ?? Number(current.exchangeRate),
        whtPct: input.whtPct ?? Number(current.whtPct),
        gstPct: input.gstPct ?? Number(current.gstPct),
        bankChargesPkr: input.bankChargesPkr ?? Number(current.bankChargesPkr) / AMOUNT_MULTIPLIER,
        receivedAt: input.receivedAt ?? current.receivedAt.toISOString(),
        clientId: "",
      };
      const calc = calculateIncomeFields(merged as CreateIncomeInput);
      updates.originalAmount = BigInt(Math.round(merged.originalAmount * AMOUNT_MULTIPLIER));
      updates.originalCurrency = merged.originalCurrency;
      updates.exchangeRate = merged.exchangeRate;
      updates.grossPkr = calc.grossPkr;
      updates.whtPct = merged.whtPct;
      updates.whtAmountPkr = calc.whtAmountPkr;
      updates.gstPct = merged.gstPct;
      updates.gstAmountPkr = calc.gstAmountPkr;
      updates.bankChargesPkr = calc.bankChargesPkrBigInt;
      updates.netPkr = calc.netPkr;
      updates.period = calc.period;
    }
  }

  return prisma.incomeRecord.update({ where: { id }, data: updates, select: detailSelect });
}

export async function clearIncomeRecord(id: string) {
  return prisma.incomeRecord.update({
    where: { id },
    data: { status: "cleared" },
    select: detailSelect,
  });
}

export async function incomeExists(id: string): Promise<boolean> {
  return (await prisma.incomeRecord.count({ where: { id } })) > 0;
}
