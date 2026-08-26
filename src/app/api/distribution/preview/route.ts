import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getDistributionPreview } from "@backend/services/distributionService";

// GET /api/distribution/preview
export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const preview = await getDistributionPreview();
    return ok(preview);
  } catch (err) {
    return serverError(err);
  }
}
