import { z } from "zod";

export const createUpsellSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().nullable(),
  billingMode: z.enum(["one_time", "recurring"]),
  amountPkr: z.coerce.number().positive("Amount must be greater than 0"),
  earnerAccountId: z.string().uuid("Invalid earner account ID"),
  commissionRatePct: z.coerce.number().min(0).max(100),
  managingPartnerId: z.string().uuid().optional().nullable(),
  managingCommissionRatePct: z.coerce.number().min(0).max(100).default(0),
});

export const updateUpsellSchema = createUpsellSchema.partial();

export const listUpsellsSchema = z.object({
  status: z.enum(["pending", "approved", "active", "completed", "cancelled", "all"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateUpsellInput = z.infer<typeof createUpsellSchema>;
export type UpdateUpsellInput = z.infer<typeof updateUpsellSchema>;
export type ListUpsellsInput = z.infer<typeof listUpsellsSchema>;
