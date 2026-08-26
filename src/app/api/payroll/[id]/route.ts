import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getPayrollRecord, editPayrollRecord } from "@backend/services/payrollService";
import { updatePayrollSchema } from "@backend/validators/payrollValidator";

// GET /api/payroll/:id
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { id } = await params;
    const record = await getPayrollRecord(id);
    if (!record) return notFound("Payroll record not found");
    return ok(record);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/payroll/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const body = await req.json();
    const parsed = updatePayrollSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const record = await editPayrollRecord(id, parsed.data);
    if (!record) return notFound("Payroll record not found");
    return ok(record);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Cannot edit")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
