import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getDistributionPreview } from "@backend/services/distributionService";

// GET /api/distribution/preview
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const preview = await getDistributionPreview();
    return ok(preview);
  } catch (err) {
    return serverError(err);
  }
}
