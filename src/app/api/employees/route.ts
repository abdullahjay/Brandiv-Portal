import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, forbidden, created, serverError } from "@backend/lib/apiResponse";
import { listEmployeesSchema, createEmployeeSchema } from "@backend/validators/employeeValidator";
import { listEmployees, addEmployee } from "@backend/services/employeeService";

export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listEmployeesSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query", parsed.error.flatten());

    return ok(await listEmployees(parsed.data));
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const role = user.role as string;
    if (!["super_admin", "admin", "manager"].includes(role)) return forbidden();

    const body = await req.json();
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    return created(await addEmployee(parsed.data));
  } catch (err) {
    return serverError(err);
  }
}
