import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@backend/lib/apiResponse";
import { updateUserSchema } from "@backend/validators/userValidator";
import { getUser, editUser, deactivateUser, reactivateUser, removeUser } from "@backend/services/userService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    if (!["super_admin", "admin", "manager"].includes(role) && session.user.id !== params.id) {
      return forbidden();
    }

    const user = await getUser(params.id);
    if (!user) return notFound("User not found");
    return ok(user);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    const isAdmin = ["super_admin", "admin"].includes(role);
    const isSelf = session.user.id === params.id;

    if (!isAdmin && !isSelf) return forbidden();

    const body = await req.json();
    if (!isAdmin) {
      delete body.role;
      delete body.status;
    }

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const user = await editUser(params.id, parsed.data);
    if (!user) return notFound("User not found");
    return ok(user);
  } catch (err) {
    if (err instanceof Error && (err.message.includes("already in use") || err.message.includes("own account"))) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}

// DELETE = deactivate; ?reactivate=1 to reactivate; ?permanent=1 to hard-delete
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    if (!["super_admin", "admin"].includes(role)) return forbidden();

    const { searchParams } = new URL(req.url);

    if (searchParams.get("permanent") === "1") {
      const done = await removeUser(params.id, session.user.id);
      if (!done) return notFound("User not found");
      return ok({ deleted: true });
    }

    if (searchParams.get("reactivate") === "1") {
      const done = await reactivateUser(params.id);
      if (!done) return notFound("User not found");
      return ok({ reactivated: true });
    }

    const done = await deactivateUser(params.id, session.user.id);
    if (!done) return notFound("User not found");
    return ok({ deactivated: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("own account")) return badRequest(err.message);
    return serverError(err);
  }
}
