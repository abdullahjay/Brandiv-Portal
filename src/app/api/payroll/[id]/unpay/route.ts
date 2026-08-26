import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { revertPayrollRecord } from "@backend/services/payrollService";

// POST /api/payroll/:id/unpay
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin"].includes(user.role)) {
      return unauthorized("Only admins can revert paid payroll records");
    }

    const { id } = await params;
    const record = await revertPayrollRecord(id);
    if (!record) return notFound("Payroll record not found");
    return ok(record);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Only paid")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
