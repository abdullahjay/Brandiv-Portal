import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { payPayrollRecord } from "@backend/services/payrollService";

// POST /api/payroll/:id/pay
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { id } = await params;
    const record = await payPayrollRecord(id);
    if (!record) return notFound("Payroll record not found");
    return ok(record);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already marked")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
