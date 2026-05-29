import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getTransfer } from "@backend/services/transferService";

const ALLOWED = ["super_admin", "admin", "finance"];

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!ALLOWED.includes(session.user.role)) return unauthorized("Insufficient permissions");

    const data = await getTransfer(params.id);
    if (!data) return notFound("Transfer not found");
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
