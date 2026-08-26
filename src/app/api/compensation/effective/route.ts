import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getEffectiveCompensationsForPeriod } from "@backend/services/compensationService";

export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");
    if (!period || !/^\d{4}-\d{2}$/.test(period)) return badRequest("period param required (YYYY-MM)");
    return ok(await getEffectiveCompensationsForPeriod(period));
  } catch (err) {
    return serverError(err);
  }
}
