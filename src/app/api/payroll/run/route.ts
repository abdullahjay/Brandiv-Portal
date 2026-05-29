import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { runBatchPayroll } from "@backend/services/payrollService";
import { runPayrollSchema } from "@backend/validators/payrollValidator";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const body = await req.json();
    const parsed = runPayrollSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const result = await runBatchPayroll(parsed.data);
    return ok(result);
  } catch (err) {
    return serverError(err);
  }
}
