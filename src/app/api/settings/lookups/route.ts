import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, forbidden, created, serverError } from "@backend/lib/apiResponse";
import { createLookupSchema } from "@backend/validators/settingsValidator";
import { listLookups, addLookup } from "@backend/services/settingService";

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    return ok(await listLookups());
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    if (!["super_admin", "admin"].includes(role)) return forbidden();

    const body = await req.json();
    const parsed = createLookupSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    return created(await addLookup(parsed.data));
  } catch (err) {
    return serverError(err);
  }
}
