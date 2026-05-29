import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@backend/lib/apiResponse";
import { updateEmployeeSchema } from "@backend/validators/employeeValidator";
import { getEmployee, editEmployee, deactivateEmployee, reactivateEmployee, removeEmployee } from "@backend/services/employeeService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const emp = await getEmployee(params.id);
    if (!emp) return notFound("Employee not found");
    return ok(emp);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    if (!["super_admin", "admin", "manager"].includes(role)) return forbidden();

    const body = await req.json();
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const emp = await editEmployee(params.id, parsed.data);
    if (!emp) return notFound("Employee not found");
    return ok(emp);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    if (!["super_admin", "admin", "manager"].includes(role)) return forbidden();

    const { searchParams } = new URL(req.url);

    if (searchParams.get("permanent") === "1") {
      const done = await removeEmployee(params.id);
      return done ? ok({ deleted: true }) : notFound("Employee not found");
    }

    if (searchParams.get("reactivate") === "1") {
      const done = await reactivateEmployee(params.id);
      return done ? ok({ reactivated: true }) : notFound("Employee not found");
    }

    const done = await deactivateEmployee(params.id);
    return done ? ok({ deactivated: true }) : notFound("Employee not found");
  } catch (err) {
    return serverError(err);
  }
}
