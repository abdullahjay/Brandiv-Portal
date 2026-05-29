import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { fetchCashFlow } from "@backend/services/statementService";
import { getCashFlowSchema } from "@backend/validators/statementValidator";

// GET /api/statements/cashflow?period=YYYY-MM
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { searchParams } = new URL(req.url);
    const parsed = getCashFlowSchema.safeParse({ period: searchParams.get("period") });
    if (!parsed.success) return badRequest("Period is required (YYYY-MM)", parsed.error.flatten());

    const data = await fetchCashFlow(parsed.data.period);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
