import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getLookupsByType, getAllLookups, addLookup } from "@backend/services/lookupService";
import { z } from "zod";

const createSchema = z.object({
  type: z.string().min(1).max(50),
  value: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
  code: z.string().max(20).optional(),
  meta: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/lookups           → returns all lookups grouped by type
// GET /api/lookups?type=xxx  → returns lookups for a specific type
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type) {
      const items = await getLookupsByType(type);
      return ok(items);
    }

    const grouped = await getAllLookups();
    return ok(grouped);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/lookups — admin only
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role;
    if (!["super_admin", "admin"].includes(role)) return unauthorized("Insufficient permissions");

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const item = await addLookup(parsed.data);
    return ok(item);
  } catch (err) {
    return serverError(err);
  }
}
