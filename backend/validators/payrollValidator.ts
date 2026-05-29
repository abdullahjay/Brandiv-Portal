import { z } from "zod";

export const runPayrollSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
  entries: z
    .array(
      z
        .object({
          employeeId: z.string().uuid().optional(),
          userId: z.string().uuid().optional(),
          grossPkr: z.number().positive("Gross must be positive"),
          deductions: z.number().min(0).default(0),
          notes: z.string().optional().nullable(),
        })
        .refine((e) => !!(e.employeeId ?? e.userId), {
          message: "Each entry needs employeeId or userId",
        })
    )
    .min(1, "At least one entry required")
    .max(500),
});

export const createPayrollSchema = z
  .object({
    userId: z.string().uuid("Invalid user ID").optional(),
    employeeId: z.string().uuid("Invalid employee ID").optional(),
    period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM format"),
    grossPkr: z.coerce.number().positive("Gross amount must be greater than 0"),
    deductions: z.coerce.number().min(0).default(0),
    notes: z.string().optional().nullable(),
  })
  .refine((d) => !!(d.userId ?? d.employeeId), {
    message: "Either userId or employeeId is required",
    path: ["userId"],
  });

export const updatePayrollSchema = z.object({
  grossPkr: z.coerce.number().positive().optional(),
  deductions: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export const listPayrollSchema = z.object({
  status: z.enum(["all", "pending", "paid"]).default("all"),
  userId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  period: z.string().max(10).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type RunPayrollInput = z.infer<typeof runPayrollSchema>;
export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;
export type UpdatePayrollInput = z.infer<typeof updatePayrollSchema>;
export type ListPayrollInput = z.infer<typeof listPayrollSchema>;
