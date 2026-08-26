import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { deleteCompensation } from "@backend/services/compensationService";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    if (!["super_admin", "admin"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }
    const { id } = await params;
    try { await deleteCompensation(id); } catch { return notFound("Compensation record not found"); }
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
