import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getDashboardData } from "@backend/repositories/dashboardRepository";

function currentPeriod() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

// GET /api/dashboard?period=YYYY-MM
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? currentPeriod();

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return badRequest("Invalid period format — use YYYY-MM");
    }

    const data = await getDashboardData(period);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
