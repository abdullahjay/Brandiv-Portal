import { z } from "zod";

export const createExpenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(500),
  category: z.string().min(1, "Category is required").max(100),
  amountPkr: z.coerce.number().positive("Amount must be greater than 0"),
  originalAmount: z.coerce.number().positive().optional().nullable(),
  originalCurrency: z.string().length(3).optional().nullable(),
  exchangeRate: z.coerce.number().positive().optional().nullable(),
  date: z.string().min(1, "Date is required"),
  projectId: z.string().uuid().optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const listExpensesSchema = z.object({
  category: z.string().max(100).optional(),
  projectId: z.string().uuid().optional(),
  period: z.string().max(10).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesInput = z.infer<typeof listExpensesSchema>;
