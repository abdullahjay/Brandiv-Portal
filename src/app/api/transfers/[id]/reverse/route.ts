import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, notFound, badRequest, serverError } from "@backend/lib/apiResponse";
import { reverseTransfer } from "@backend/services/transferService";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!["super_admin", "admin"].includes(session.user.role)) return unauthorized("Only admins can reverse transfers");

    const { id } = await params;
    const reversal = await reverseTransfer(id, session.user.id);
    return ok(reversal);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Transfer not found") return notFound("Transfer not found");
      if (err.message === "Transfer has already been reversed") return badRequest(err.message);
    }
    return serverError(err);
  }
}
