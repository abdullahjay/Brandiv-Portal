import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, notFound, badRequest, serverError } from "@backend/lib/apiResponse";
import { approveCommissionById } from "@backend/services/commissionService";

// POST /api/commissions/:id/approve
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { id } = await params;
    const commission = await approveCommissionById(id);
    if (!commission) return notFound("Commission not found");
    return ok(commission);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Only pending")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
