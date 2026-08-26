import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getTransfer } from "@backend/services/transferService";

const ALLOWED = ["super_admin", "admin", "finance"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    if (!ALLOWED.includes(user.role)) return unauthorized("Insufficient permissions");

    const { id } = await params;
    const data = await getTransfer(id);
    if (!data) return notFound("Transfer not found");
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
