import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getAccount, editAccount, removeAccount } from "@backend/services/accountService";
import { updateAccountSchema } from "@backend/validators/accountValidator";

// GET /api/accounts/:id
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const account = await getAccount(id);
    if (!account) return notFound("Account not found");
    return ok(account);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/accounts/:id
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { id } = await params;
    const deleted = await removeAccount(id);
    if (!deleted) return notFound("Account not found");
    return ok({ id });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Foreign key constraint")) {
      return badRequest("Cannot delete this account — it is linked to clients or commissions.");
    }
    return serverError(err);
  }
}

// PUT /api/accounts/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const body = await req.json();
    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const account = await editAccount(id, parsed.data);
    if (!account) return notFound("Account not found");
    return ok(account);
  } catch (err) {
    if (err instanceof Error && err.message.includes("exceed 100%")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
