import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { editUpsell, removeUpsell } from "@backend/services/upsellService";
import { updateUpsellSchema } from "@backend/validators/upsellValidator";

// PUT /api/projects/:id/upsells/:upsellId
export async function PUT(req: Request, { params }: { params: Promise<{ id: string; upsellId: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const parsed = updateUpsellSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { upsellId } = await params;
    const upsell = await editUpsell(upsellId, parsed.data);
    if (!upsell) return notFound("Upsell not found");
    return ok(upsell);
  } catch (err) {
    if (err instanceof Error && (err.message.includes("Only pending") || err.message.includes("Cannot edit"))) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}

// DELETE /api/projects/:id/upsells/:upsellId
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; upsellId: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { upsellId } = await params;
    const result = await removeUpsell(upsellId);
    if (result === null) return notFound("Upsell not found");
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof Error && (err.message.includes("Only pending") || err.message.includes("Cannot delete"))) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
