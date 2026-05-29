import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, notFound, badRequest, serverError } from "@backend/lib/apiResponse";
import { approveCommissionById } from "@backend/services/commissionService";

// POST /api/commissions/:id/approve
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const commission = await approveCommissionById(params.id);
    if (!commission) return notFound("Commission not found");
    return ok(commission);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Only pending")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
