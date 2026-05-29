import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER } from "@backend/lib/constants";
import type { CreateInvoiceInput, UpdateInvoiceInput, ListInvoicesInput } from "@backend/validators/invoiceValidator";
import type { Prisma } from "@prisma/client";

const listSelect = {
  id: true,
  invoiceNumber: true,
  currency: true,
  subtotal: true,
  taxAmount: true,
  totalAmount: true,
  paymentTerms: true,
  issueDate: true,
  dueDate: true,
  paidAt: true,
  status: true,
  paymentNumber: true,
  createdAt: true,
  client: { select: { id: true, companyName: true } },
  project: { select: { id: true, name: true } },
} satisfies Prisma.InvoiceSelect;

const detailSelect = {
  ...listSelect,
  notes: true,
  lineItems: {
    select: { id: true, description: true, quantity: true, rate: true, amount: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.InvoiceSelect;

export async function findManyInvoices(input: ListInvoicesInput) {
  const { status, clientId, projectId, search, page, pageSize } = input;

  const where: Prisma.InvoiceWhereInput = {
    ...(status !== "all" && { status }),
    ...(clientId && { clientId }),
    ...(projectId && { projectId }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { client: { companyName: { contains: search, mode: "insensitive" } } },
        { project: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      select: listSelect,
      orderBy: { issueDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findInvoiceById(id: string) {
  return prisma.invoice.findUnique({ where: { id }, select: detailSelect });
}

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let seq = 1;
  if (last) {
    const parts = last.invoiceNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export async function createInvoice(input: CreateInvoiceInput, invoiceNumber: string) {
  const { clientId, projectId, currency, issueDate, dueDate, paymentTerms, taxPct, paymentNumber, notes, lineItems } = input;

  const subtotal = lineItems.reduce((sum, item) => {
    return sum + BigInt(Math.round(item.rate * AMOUNT_MULTIPLIER)) * BigInt(item.quantity);
  }, BigInt(0));

  const taxAmount = BigInt(Math.round(Number(subtotal) * taxPct / 100));
  const totalAmount = subtotal + taxAmount;

  return prisma.invoice.create({
    data: {
      invoiceNumber,
      clientId,
      projectId: projectId ?? null,
      currency,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      paymentTerms: paymentTerms ?? null,
      subtotal,
      taxAmount,
      totalAmount,
      paymentNumber: paymentNumber ?? 1,
      notes: notes ?? null,
      lineItems: {
        create: lineItems.map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          rate: BigInt(Math.round(item.rate * AMOUNT_MULTIPLIER)),
          amount: BigInt(Math.round(item.rate * AMOUNT_MULTIPLIER)) * BigInt(item.quantity),
          sortOrder: idx,
        })),
      },
    },
    select: detailSelect,
  });
}

export async function updateInvoice(id: string, input: UpdateInvoiceInput) {
  const { projectId, currency, issueDate, dueDate, paymentTerms, taxPct, paymentNumber, notes, lineItems } = input;

  const updates: Prisma.InvoiceUpdateInput = {};

  if (currency !== undefined) updates.currency = currency;
  if (issueDate !== undefined) updates.issueDate = new Date(issueDate);
  if (dueDate !== undefined) updates.dueDate = new Date(dueDate);
  if (paymentTerms !== undefined) updates.paymentTerms = paymentTerms;
  if (paymentNumber !== undefined) updates.paymentNumber = paymentNumber;
  if (notes !== undefined) updates.notes = notes;
  if (projectId !== undefined) {
    updates.project = projectId ? { connect: { id: projectId } } : { disconnect: true };
  }

  if (lineItems !== undefined) {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + BigInt(Math.round(item.rate * AMOUNT_MULTIPLIER)) * BigInt(item.quantity);
    }, BigInt(0));
    const effectiveTaxPct = taxPct ?? 0;
    const taxAmount = BigInt(Math.round(Number(subtotal) * effectiveTaxPct / 100));
    const totalAmount = subtotal + taxAmount;

    updates.subtotal = subtotal;
    updates.taxAmount = taxAmount;
    updates.totalAmount = totalAmount;
    updates.lineItems = {
      deleteMany: {},
      create: lineItems.map((item, idx) => ({
        description: item.description,
        quantity: item.quantity,
        rate: BigInt(Math.round(item.rate * AMOUNT_MULTIPLIER)),
        amount: BigInt(Math.round(item.rate * AMOUNT_MULTIPLIER)) * BigInt(item.quantity),
        sortOrder: idx,
      })),
    };
  } else if (taxPct !== undefined) {
    const current = await prisma.invoice.findUnique({ where: { id }, select: { subtotal: true } });
    if (current) {
      const taxAmount = BigInt(Math.round(Number(current.subtotal) * taxPct / 100));
      updates.taxAmount = taxAmount;
      updates.totalAmount = current.subtotal + taxAmount;
    }
  }

  return prisma.invoice.update({ where: { id }, data: updates, select: detailSelect });
}

export async function markInvoiceSent(id: string) {
  return prisma.invoice.update({
    where: { id },
    data: { status: "sent" },
    select: detailSelect,
  });
}

export async function markInvoicePaid(id: string) {
  return prisma.invoice.update({
    where: { id },
    data: { status: "paid", paidAt: new Date() },
    select: detailSelect,
  });
}

export async function cancelInvoice(id: string) {
  return prisma.invoice.update({
    where: { id },
    data: { status: "cancelled" },
    select: detailSelect,
  });
}

export async function invoiceExists(id: string): Promise<boolean> {
  return (await prisma.invoice.count({ where: { id } })) > 0;
}
