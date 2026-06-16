import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { deleteCompensation } from "@backend/services/compensationService";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!["super_admin", "admin"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }
    const { id } = await params;
    try { await deleteCompensation(id); } catch { return notFound("Compensation record not found"); }
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
