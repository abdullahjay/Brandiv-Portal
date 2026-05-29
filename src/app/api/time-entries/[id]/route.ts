import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, notFound, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getTimeEntry, editTimeEntry, removeTimeEntry } from "@backend/services/timeEntryService";
import { updateTimeEntrySchema } from "@backend/validators/timeEntryValidator";

// GET /api/time-entries/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const entry = await getTimeEntry(params.id);
    if (!entry) return notFound("Time entry not found");

    const canView =
      entry.user.id === session.user.id ||
      ["super_admin", "admin", "manager"].includes(session.user.role);

    if (!canView) return unauthorized("Insufficient permissions");

    return ok(entry);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/time-entries/:id
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = updateTimeEntrySchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const entry = await editTimeEntry(params.id, session.user.id, session.user.role, parsed.data);
    return ok(entry);
  } catch (err) {
    if (err instanceof Error && err.message.includes("only edit")) {
      return unauthorized(err.message);
    }
    if (err instanceof Error && err.message === "Time entry not found") {
      return notFound(err.message);
    }
    return serverError(err);
  }
}

// DELETE /api/time-entries/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    await removeTimeEntry(params.id, session.user.id, session.user.role);
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("only delete")) {
      return unauthorized(err.message);
    }
    if (err instanceof Error && err.message === "Time entry not found") {
      return notFound(err.message);
    }
    return serverError(err);
  }
}
