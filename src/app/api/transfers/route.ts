import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listTransfers, createTransfer } from "@backend/services/transferService";
import { createTransferSchema } from "@backend/validators/transferValidator";

const ALLOWED = ["super_admin", "admin", "finance"];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!ALLOWED.includes(session.user.role)) return unauthorized("Insufficient permissions");

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? undefined;
    return ok(await listTransfers(period));
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();
    if (!ALLOWED.includes(session.user.role)) return unauthorized("Insufficient permissions");

    const body = await req.json();
    const parsed = createTransferSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const transfer = await createTransfer(parsed.data, session.user.id);
    return created(transfer);
  } catch (err) {
    if (err instanceof Error && (
      err.message.includes("Insufficient balance") ||
      err.message.includes("not found")
    )) return badRequest(err.message);
    return serverError(err);
  }
}
