import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getAccountStatement } from "@backend/repositories/accountStatementRepository";

// GET /api/accounts/[id]/statement?period=YYYY-MM  (period is optional)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? undefined;

    const data = await getAccountStatement(params.id, period);
    return ok(data);
  } catch (err) {
    if (err instanceof Error && err.message === "Account not found") {
      return notFound("Account not found");
    }
    return serverError(err);
  }
}
