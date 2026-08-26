import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, notFound, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getTimeEntry, editTimeEntry, removeTimeEntry } from "@backend/services/timeEntryService";
import { updateTimeEntrySchema } from "@backend/validators/timeEntryValidator";

// GET /api/time-entries/:id
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const entry = await getTimeEntry(id);
    if (!entry) return notFound("Time entry not found");

    const canView =
      entry.user.id === user.id ||
      ["super_admin", "admin", "manager"].includes(user.role);

    if (!canView) return unauthorized("Insufficient permissions");

    return ok(entry);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/time-entries/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const parsed = updateTimeEntrySchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const entry = await editTimeEntry(id, user.id, user.role, parsed.data);
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
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    await removeTimeEntry(id, user.id, user.role);
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
