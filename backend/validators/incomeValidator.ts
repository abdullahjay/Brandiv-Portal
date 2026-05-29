import { z } from "zod";

export const createIncomeSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  invoiceId: z.string().uuid().optional().nullable(),
  destinationAccountId: z.string().uuid().optional().nullable(),
  originalAmount: z.coerce.number().positive("Amount must be greater than 0"),
  originalCurrency: z.string().length(3).default("USD"),
  exchangeRate: z.coerce.number().positive("Exchange rate must be greater than 0"),
  rateSource: z.string().max(100).optional().nullable(),
  whtPct: z.coerce.number().min(0).max(100).default(0),
  gstPct: z.coerce.number().min(0).max(100).default(0),
  bankChargesPkr: z.coerce.number().min(0).default(0),
  paymentMethod: z.string().max(50).optional().nullable(),
  transactionRef: z.string().max(200).optional().nullable(),
  receivedAt: z.string().min(1, "Received date is required"),
  incomeType: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateIncomeSchema = createIncomeSchema
  .omit({ clientId: true })
  .partial();

export const listIncomeSchema = z.object({
  status: z.enum(["all", "pending", "cleared"]).default("all"),
  clientId: z.string().uuid().optional(),
  period: z.string().max(10).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>;
export type ListIncomeInput = z.infer<typeof listIncomeSchema>;
