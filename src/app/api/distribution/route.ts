import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listDistributions } from "@backend/services/distributionService";

// GET /api/distribution — list all past distributions
export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "manager", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const data = await listDistributions();
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
