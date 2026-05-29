import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  type: z.enum(["operating", "company_reserve", "stakeholder"]),
  sharePct: z.coerce.number().min(0).max(100).default(0),
  isDefaultOperating: z.boolean().default(false),
  ownerUserId: z.string().uuid().optional().nullable(),
});

export const updateAccountSchema = createAccountSchema.partial();

export const listAccountsSchema = z.object({
  type: z.enum(["operating", "company_reserve", "stakeholder", "all"]).default("all"),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ListAccountsInput = z.infer<typeof listAccountsSchema>;
