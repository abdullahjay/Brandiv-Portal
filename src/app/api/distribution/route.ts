import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listDistributions } from "@backend/services/distributionService";

// GET /api/distribution — list all past distributions
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "manager", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const data = await listDistributions();
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
