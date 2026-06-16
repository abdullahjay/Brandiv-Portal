import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { revertPayrollRecord } from "@backend/services/payrollService";

// POST /api/payroll/:id/unpay
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin"].includes(session.user.role)) {
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
