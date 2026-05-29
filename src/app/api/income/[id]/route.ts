import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getIncome, editIncome, markCleared } from "@backend/services/incomeService";
import { updateIncomeSchema } from "@backend/validators/incomeValidator";

// GET /api/income/:id
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const income = await getIncome(params.id);
    if (!income) return notFound("Income record not found");
    return ok(income);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/income/:id
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = updateIncomeSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const income = await editIncome(params.id, parsed.data);
    if (!income) return notFound("Income record not found");
    return ok(income);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/income/:id/clear handled via separate route below as a convenience
// PATCH /api/income/:id — mark cleared
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const income = await markCleared(params.id);
    if (!income) return notFound("Income record not found");
    return ok(income);
  } catch (err) {
    return serverError(err);
  }
}
