import { z } from "zod";

export const createClientSchema = z.object({
  // Step 1 — Company info
  companyName: z.string().min(1, "Company name is required").max(200),
  industry: z.string().max(100).optional(),
  website: z.string().max(500).optional().or(z.literal("")),
  contactName: z.string().min(1, "Contact name is required").max(100),
  contactTitle: z.string().max(100).optional(),
  email: z.string().email("Invalid email").toLowerCase().trim(),
  phone: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  source: z.string().max(100).optional(),
  referredByUserId: z.string().uuid().optional().nullable(),

  // Step 2 — Project scope
  accountManagerId: z.string().uuid().optional().nullable(),
  partnerId: z.string().uuid().optional().nullable(),
  commissionRule: z.enum(["standard", "custom", "none"]).default("standard"),
  commissionPriorPayments: z.coerce.number().int().min(0).default(0),

  // Step 3 — Finance & legal
  currency: z.string().length(3).default("USD"),
  paymentTerms: z.string().max(50).optional(),
  billingAddress: z.string().optional(),
  taxNumber: z.string().max(100).optional(),
  contractStatus: z.enum(["not_sent", "sent", "signed"]).default("not_sent"),
  ndaRequired: z.boolean().default(false),
  status: z.enum(["active", "pending", "inactive"]).default("active"),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsSchema = z.object({
  status: z.enum(["active", "pending", "inactive", "all"]).default("all"),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsInput = z.infer<typeof listClientsSchema>;
