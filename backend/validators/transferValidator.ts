import { z } from "zod";

export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid("Invalid from-account ID"),
  toAccountId:   z.string().uuid("Invalid to-account ID"),
  amountPkr:     z.number().int().positive("Amount must be a positive integer (paise)"),
  description:   z.string().min(1, "Description is required").max(500),
  notes:         z.string().max(1000).optional().nullable(),
  transferAt:    z.string().datetime().optional(),
}).refine((d) => d.fromAccountId !== d.toAccountId, {
  message: "Source and destination accounts must be different",
  path: ["toAccountId"],
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
