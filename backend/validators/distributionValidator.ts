import { z } from "zod";

export const previewDistributionSchema = z.object({});

export const runDistributionSchema = z.object({
  label: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PreviewDistributionInput = z.infer<typeof previewDistributionSchema>;
export type RunDistributionInput = z.infer<typeof runDistributionSchema>;
