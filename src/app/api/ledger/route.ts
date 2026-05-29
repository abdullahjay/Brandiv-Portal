import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { getLedger } from "@backend/services/ledgerService";
import { listLedgerSchema } from "@backend/validators/ledgerValidator";

// GET /api/ledger
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { searchParams } = new URL(req.url);
    const parsed = listLedgerSchema.safeParse({
      period: searchParams.get("period") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 50,
    });

    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await getLedger(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
