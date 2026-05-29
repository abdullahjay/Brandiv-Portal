import {
  findManyInvoices,
  findInvoiceById,
  generateInvoiceNumber,
  createInvoice,
  updateInvoice,
  markInvoiceSent,
  markInvoicePaid,
  cancelInvoice,
  invoiceExists,
} from "@backend/repositories/invoiceRepository";
import type { CreateInvoiceInput, UpdateInvoiceInput, ListInvoicesInput } from "@backend/validators/invoiceValidator";

export async function listInvoices(input: ListInvoicesInput) {
  return findManyInvoices(input);
}

export async function getInvoice(id: string) {
  return findInvoiceById(id);
}

export async function addInvoice(data: CreateInvoiceInput) {
  const invoiceNumber = await generateInvoiceNumber();
  return createInvoice(data, invoiceNumber);
}

export async function editInvoice(id: string, data: UpdateInvoiceInput) {
  const exists = await invoiceExists(id);
  if (!exists) return null;
  return updateInvoice(id, data);
}

export async function sendInvoice(id: string) {
  const invoice = await findInvoiceById(id);
  if (!invoice) return null;
  if (invoice.status !== "draft") throw new Error("Only draft invoices can be sent");
  return markInvoiceSent(id);
}

export async function payInvoice(id: string) {
  const invoice = await findInvoiceById(id);
  if (!invoice) return null;
  if (!["sent", "overdue"].includes(invoice.status)) {
    throw new Error("Only sent or overdue invoices can be marked as paid");
  }
  return markInvoicePaid(id);
}

export async function voidInvoice(id: string) {
  const invoice = await findInvoiceById(id);
  if (!invoice) return null;
  if (invoice.status === "paid") throw new Error("Paid invoices cannot be cancelled");
  return cancelInvoice(id);
}
