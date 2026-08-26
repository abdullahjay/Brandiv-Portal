import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, notFound, badRequest, serverError } from "@backend/lib/apiResponse";
import { approveUpsell } from "@backend/services/upsellService";

// POST /api/projects/:id/upsells/:upsellId/approve
export async function POST(req: Request, { params }: { params: Promise<{ id: string; upsellId: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "manager", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { upsellId } = await params;
    const upsell = await approveUpsell(upsellId);
    if (!upsell) return notFound("Upsell not found");
    return ok(upsell);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Only pending")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
