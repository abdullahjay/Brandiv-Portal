import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listIncome, addIncome } from "@backend/services/incomeService";
import { listIncomeSchema, createIncomeSchema } from "@backend/validators/incomeValidator";

// GET /api/income
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listIncomeSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await listIncome(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/income
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = createIncomeSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const income = await addIncome(parsed.data, session.user.id);
    return created(income);
  } catch (err) {
    return serverError(err);
  }
}
