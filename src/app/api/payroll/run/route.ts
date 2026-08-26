import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { runBatchPayroll } from "@backend/services/payrollService";
import { runPayrollSchema } from "@backend/validators/payrollValidator";

export async function POST(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    if (!["super_admin", "admin", "finance"].includes(user.role)) {
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
