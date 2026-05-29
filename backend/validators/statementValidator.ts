import { z } from "zod";

const periodSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM"),
});

export const getPnLSchema = periodSchema;
export const getCashFlowSchema = periodSchema;
