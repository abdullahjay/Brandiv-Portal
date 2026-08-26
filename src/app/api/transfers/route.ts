import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listTransfers, createTransfer } from "@backend/services/transferService";
import { createTransferSchema } from "@backend/validators/transferValidator";

const ALLOWED = ["super_admin", "admin", "finance"];

export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    if (!ALLOWED.includes(user.role)) return unauthorized("Insufficient permissions");

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? undefined;
    return ok(await listTransfers(period));
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();
    if (!ALLOWED.includes(user.role)) return unauthorized("Insufficient permissions");

    const body = await req.json();
    const parsed = createTransferSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const transfer = await createTransfer(parsed.data, user.id);
    return created(transfer);
  } catch (err) {
    if (err instanceof Error && (
      err.message.includes("Insufficient balance") ||
      err.message.includes("not found")
    )) return badRequest(err.message);
    return serverError(err);
  }
}
