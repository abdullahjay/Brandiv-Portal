import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listPayroll, addPayrollRecord } from "@backend/services/payrollService";
import { listPayrollSchema, createPayrollSchema } from "@backend/validators/payrollValidator";

// GET /api/payroll
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { searchParams } = new URL(req.url);
    const parsed = listPayrollSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await listPayroll(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/payroll
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const body = await req.json();
    const parsed = createPayrollSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const record = await addPayrollRecord(parsed.data);
    return created(record);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
