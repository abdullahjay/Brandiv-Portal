import { z } from "zod";

export const upsertSettingsSchema = z.object({
  invoice_prefix: z.string().min(1).max(20).optional(),
  default_wht_pct: z.coerce.number().min(0).max(100).optional(),
  default_gst_pct: z.coerce.number().min(0).max(100).optional(),
  company_name: z.string().max(200).optional(),
  company_ntn: z.string().max(50).optional(),
  company_address: z.string().max(500).optional(),
  logo_url: z.string().max(1000).optional().nullable(),
  commission_rate_first: z.coerce.number().min(0).max(100).optional(),
  commission_rate_recurring: z.coerce.number().min(0).max(100).optional(),
});

export const fxRatesSchema = z.record(z.string(), z.coerce.number().positive());

export const createLookupSchema = z.object({
  type: z.string().min(1).max(50),
  value: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
  code: z.string().max(20).optional().nullable(),
  meta: z.record(z.unknown()).optional().nullable(),
  sortOrder: z.coerce.number().default(0),
});

export const updateLookupSchema = z.object({
  value: z.string().min(1).max(200).optional(),
  label: z.string().min(1).max(200).optional(),
  code: z.string().max(20).optional().nullable(),
  meta: z.record(z.unknown()).optional().nullable(),
  sortOrder: z.coerce.number().optional(),
  active: z.boolean().optional(),
});

export type UpsertSettingsInput = z.infer<typeof upsertSettingsSchema>;
export type FxRatesInput = z.infer<typeof fxRatesSchema>;
export type CreateLookupInput = z.infer<typeof createLookupSchema>;
export type UpdateLookupInput = z.infer<typeof updateLookupSchema>;
