import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { runDistribution } from "@backend/services/distributionService";
import { runDistributionSchema } from "@backend/validators/distributionValidator";

// POST /api/distribution/run
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin"].includes(session.user.role)) {
      return unauthorized("Only super_admin or admin can run distribution");
    }

    const body = await req.json();
    const parsed = runDistributionSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const distribution = await runDistribution(parsed.data, session.user.id);
    return created(distribution);
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      if (
        msg.includes("zero or negative") ||
        msg.includes("No default operating") ||
        msg.includes("No distribution accounts") ||
        msg.includes("must equal 100%")
      ) {
        return badRequest(msg);
      }
    }
    return serverError(err);
  }
}
