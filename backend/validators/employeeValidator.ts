import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")).transform((v) => v || undefined),
  phone: z.string().max(50).optional(),
  cnic: z.string().max(20).optional(),
  joinDate: z.string().optional().nullable(),
  baseSalary: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const listEmployeesSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  department: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(500).default(50),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesInput = z.infer<typeof listEmployeesSchema>;
