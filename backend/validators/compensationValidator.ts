import { z } from "zod";

export const upsertCompensationSchema = z.object({
  employeeId: z.string().min(1),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM"),
  baseSalary: z.coerce.number().min(0),
  defaultTaxPkr: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});
