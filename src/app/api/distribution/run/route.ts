import { requireApiUser } from "@backend/lib/requestAuth";
import { created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { runDistribution } from "@backend/services/distributionService";
import { runDistributionSchema } from "@backend/validators/distributionValidator";

// POST /api/distribution/run
export async function POST(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin"].includes(user.role)) {
      return unauthorized("Only super_admin or admin can run distribution");
    }

    const body = await req.json();
    const parsed = runDistributionSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const distribution = await runDistribution(parsed.data, user.id);
    return created(distribution);
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      if (
        msg.includes("zero or negative") ||
        msg.includes("No default operating") ||
        msg.includes("No distribution accounts") ||
        msg.includes("must be less than 100%") ||
        msg.includes("must not exceed 100%")
      ) {
        return badRequest(msg);
      }
    }
    return serverError(err);
  }
}
