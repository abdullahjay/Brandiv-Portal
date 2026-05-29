import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.coerce.number().int().min(1).default(1),
  rate: z.coerce.number().min(0),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  projectId: z.string().uuid().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  paymentTerms: z.string().optional().nullable(),
  taxPct: z.coerce.number().min(0).max(100).default(0),
  paymentNumber: z.coerce.number().int().positive().default(1),
  notes: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export const updateInvoiceSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  currency: z.string().length(3).optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional().nullable(),
  taxPct: z.coerce.number().min(0).max(100).optional(),
  paymentNumber: z.coerce.number().int().positive().optional(),
  notes: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
});

export const listInvoicesSchema = z.object({
  status: z.enum(["all", "draft", "sent", "paid", "overdue", "cancelled"]).default("all"),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;
