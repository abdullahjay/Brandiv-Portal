import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { editLookup } from "@backend/services/lookupService";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  code: z.string().max(20).optional(),
  meta: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

// PATCH /api/lookups/:id — admin only
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role;
    if (!["super_admin", "admin"].includes(role)) return unauthorized("Insufficient permissions");

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const item = await editLookup(params.id, parsed.data as any);
    return ok(item);
  } catch (err) {
    return serverError(err);
  }
}
