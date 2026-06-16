import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getAllEmployeesWithCompensationHistory, upsertCompensation } from "@backend/services/compensationService";
import { upsertCompensationSchema } from "@backend/validators/compensationValidator";

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    return ok(await getAllEmployeesWithCompensationHistory());
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }
    const body = await req.json();
    const parsed = upsertCompensationSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    return ok(await upsertCompensation(parsed.data));
  } catch (err) {
    return serverError(err);
  }
}
