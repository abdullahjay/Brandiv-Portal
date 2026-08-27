import { z } from "zod";

const periodValueSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
  z.literal("all"),
  z.literal(""),
]);

export const getPnLSchema = z.object({
  period: periodValueSchema.optional(),
});

export const getCashFlowSchema = z.object({
  period: periodValueSchema.optional(),
});
