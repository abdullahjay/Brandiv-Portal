import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { payPayrollRecord } from "@backend/services/payrollService";

// POST /api/payroll/:id/pay
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const record = await payPayrollRecord(params.id);
    if (!record) return notFound("Payroll record not found");
    return ok(record);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already marked")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
