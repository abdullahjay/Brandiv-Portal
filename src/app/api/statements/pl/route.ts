import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { fetchPnL } from "@backend/services/statementService";
import { getPnLSchema } from "@backend/validators/statementValidator";

// GET /api/statements/pl?period=YYYY-MM
export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { searchParams } = new URL(req.url);
    const parsed = getPnLSchema.safeParse({ period: searchParams.get("period") });
    if (!parsed.success) return badRequest("Period is required (YYYY-MM)", parsed.error.flatten());

    const data = await fetchPnL(parsed.data.period);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
