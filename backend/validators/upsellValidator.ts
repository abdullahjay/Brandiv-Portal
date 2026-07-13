import { z } from "zod";

export const createUpsellSchema = z.object({
  source:          z.enum(["addon", "value_increase"]),
  incrementPkr:    z.number().int().positive("Amount must be positive"),
  ratePct:         z.number().min(0).max(100, "Rate cannot exceed 100%"),
  period:          z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
  earnerAccountId: z.string().uuid("Invalid earner account"),
  description:     z.string().max(1000).optional(),
});

export const updateUpsellSchema = createUpsellSchema.partial();

export type CreateUpsellBody = z.infer<typeof createUpsellSchema>;
export type UpdateUpsellBody = z.infer<typeof updateUpsellSchema>;
