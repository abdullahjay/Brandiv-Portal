import { z } from "zod";

export const createTimeEntrySchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  hours: z.number().positive("Hours must be positive").max(24, "Cannot exceed 24 hours per entry"),
  description: z.string().max(500).optional().nullable(),
  billable: z.boolean().default(true),
});

export const updateTimeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hours: z.number().positive().max(24).optional(),
  description: z.string().max(500).optional().nullable(),
  billable: z.boolean().optional(),
});

export const listTimeEntriesSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  projectId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  billable: z.preprocess(
    (v) => v === "true" ? true : v === "false" ? false : undefined,
    z.boolean().optional()
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
