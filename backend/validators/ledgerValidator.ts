import { z } from "zod";

export const listLedgerSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM").optional(),
  type: z.enum(["income", "expense", "payroll", "distribution", "commission", "transfer"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
