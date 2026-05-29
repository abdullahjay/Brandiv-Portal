import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  clientId: z.string().uuid("Invalid client ID"),
  type: z.enum(["one_time", "recurring", "milestone"]).default("one_time"),
  status: z.enum(["active", "pending", "done", "cancelled"]).default("pending"),
  currency: z.string().length(3).default("USD"),
  valueOriginal: z.coerce.number().min(0).default(0),
  progressPct: z.coerce.number().int().min(0).max(100).default(0),
  startDate: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  commissionExempt: z.boolean().default(false),
  billingCycleDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial().omit({ clientId: true });

export const listProjectsSchema = z.object({
  status: z.enum(["active", "pending", "done", "cancelled", "all"]).default("all"),
  type: z.enum(["one_time", "recurring", "milestone", "all"]).default("all"),
  clientId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsInput = z.infer<typeof listProjectsSchema>;
