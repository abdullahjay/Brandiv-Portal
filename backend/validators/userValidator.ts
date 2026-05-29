import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  role: z.enum(["super_admin", "admin", "manager", "staff", "finance"]).default("staff"),
  status: z.enum(["active", "inactive"]).default("active"),
  avatarUrl: z.string().url().optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(["super_admin", "admin", "manager", "staff", "finance"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  avatarUrl: z.string().optional().nullable(),
});

export const listUsersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(["super_admin", "admin", "manager", "staff", "finance"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
