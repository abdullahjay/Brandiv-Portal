import { prisma } from "@backend/lib/prisma";
import {
  findManyIncome,
  findIncomeById,
  calculateIncomeFields,
  updateIncomeRecord,
  clearIncomeRecord,
  incomeExists,
} from "@backend/repositories/incomeRepository";
import { triggerCommission } from "@backend/services/commissionService";
import type { CreateIncomeInput, UpdateIncomeInput, ListIncomeInput } from "@backend/validators/incomeValidator";

export async function listIncome(input: ListIncomeInput) {
  return findManyIncome(input);
}

export async function getIncome(id: string) {
  return findIncomeById(id);
}

export async function addIncome(input: CreateIncomeInput, createdById: string) {
  const calc = calculateIncomeFields(input);

  // Resolve destination account — use provided or fall back to default operating account
  let destinationAccountId = input.destinationAccountId ?? null;
  if (!destinationAccountId) {
    const defaultOp = await prisma.crmAccount.findFirst({
      where: { type: "operating", isDefaultOperating: true },
      select: { id: true },
    });
    if (!defaultOp) throw new Error("No operating account found. Set up an operating account before recording income.");
    destinationAccountId = defaultOp.id;
  }

  // Create income record + credit destination account atomically
  const income = await prisma.$transaction(async (tx) => {
    const record = await tx.incomeRecord.create({
      data: {
        clientId: input.clientId,
        invoiceId: input.invoiceId ?? null,
        destinationAccountId,
        createdById,
        period: calc.period,
        originalAmount: BigInt(Math.round(input.originalAmount * 100)),
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
        status: input.invoiceId ? "cleared" : "pending",
      },
    });

    // Credit net PKR to the destination account
    await tx.crmAccount.update({
      where: { id: destinationAccountId! },
      data: { currentBalancePkr: { increment: calc.netPkr } },
    });

    return record;
  });

  // Fetch full record with relations
  const incomeWithRelations = await findIncomeById(income.id);

  // If linked to an invoice, resolve payment number and mark invoice paid
  let paymentNumber = 1;
  let projectId: string | null = null;

  if (input.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      select: { paymentNumber: true, projectId: true, status: true },
    });
    if (invoice) {
      paymentNumber = invoice.paymentNumber;
      projectId = invoice.projectId ?? null;
      if (invoice.status !== "paid") {
        await prisma.invoice.update({
          where: { id: input.invoiceId },
          data: { status: "paid", paidAt: new Date() },
        });
      }
    }
  }

  // Auto-trigger commission
  try {
    await triggerCommission({
      incomeRecordId: income.id,
      clientId: input.clientId,
      projectId,
      invoiceId: input.invoiceId ?? null,
      netPkr: calc.netPkr,
      paymentNumber,
      period: calc.period,
    });
  } catch {
    // Commission failure is non-fatal — income is already saved
  }

  return incomeWithRelations;
}

export async function editIncome(id: string, input: UpdateIncomeInput) {
  const exists = await incomeExists(id);
  if (!exists) return null;
  return updateIncomeRecord(id, input);
}

export async function markCleared(id: string) {
  const exists = await incomeExists(id);
  if (!exists) return null;
  return clearIncomeRecord(id);
}
