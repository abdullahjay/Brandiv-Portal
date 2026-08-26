import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, created, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { listUpsells, addUpsell } from "@backend/services/upsellService";
import { listUpsellsSchema, createUpsellSchema } from "@backend/validators/upsellValidator";

// GET /api/projects/:id/upsells
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const parsed = listUpsellsSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await listUpsells(id, parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/projects/:id/upsells
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const parsed = createUpsellSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const upsell = await addUpsell(id, parsed.data, user.id);
    if (!upsell) return notFound("Project not found");
    return created(upsell);
  } catch (err) {
    return serverError(err);
  }
}
