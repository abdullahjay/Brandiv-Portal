import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listCommissions, getCommissionStats } from "@backend/services/commissionService";
import { listCommissionsSchema } from "@backend/validators/commissionValidator";

// GET /api/commissions
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);

    // ?summary=1 returns aggregate totals only
    if (searchParams.get("summary") === "1") {
      const stats = await getCommissionStats();
      return ok(stats);
    }

    const parsed = listCommissionsSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await listCommissions(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
