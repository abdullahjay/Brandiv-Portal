import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listAccounts, addAccount } from "@backend/services/accountService";
import { listAccountsSchema, createAccountSchema } from "@backend/validators/accountValidator";

// GET /api/accounts
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listAccountsSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await listAccounts(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/accounts
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const body = await req.json();
    const parsed = createAccountSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const account = await addAccount(parsed.data);
    return created(account);
  } catch (err) {
    if (err instanceof Error && err.message.includes("exceed 100%")) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
