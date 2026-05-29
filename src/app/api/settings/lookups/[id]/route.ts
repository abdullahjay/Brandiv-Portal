import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@backend/lib/apiResponse";
import { updateLookupSchema } from "@backend/validators/settingsValidator";
import { editLookup, removeLookup } from "@backend/services/settingService";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    if (!["super_admin", "admin"].includes(role)) return forbidden();

    const body = await req.json();
    const parsed = updateLookupSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const item = await editLookup(id, parsed.data);
    if (!item) return notFound("Lookup not found");
    return ok(item);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    if (!["super_admin", "admin"].includes(role)) return forbidden();

    const { id } = await params;
    const done = await removeLookup(id);
    if (!done) return notFound("Lookup not found");
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
