import { z } from "zod";

export const listCommissionsSchema = z.object({
  status: z.enum(["all", "pending", "approved", "paid"]).default("all"),
  stakeholderAccountId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  period: z.string().max(10).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type ListCommissionsInput = z.infer<typeof listCommissionsSchema>;
