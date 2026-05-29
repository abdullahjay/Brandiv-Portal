import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, notFound, serverError, noContent } from "@backend/lib/apiResponse";
import { getExpense, editExpense, removeExpense } from "@backend/services/expenseService";
import { updateExpenseSchema } from "@backend/validators/expenseValidator";

// GET /api/expenses/:id
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const expense = await getExpense(id);
    if (!expense) return notFound("Expense not found");
    return ok(expense);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/expenses/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance", "manager"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const body = await req.json();
    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const expense = await editExpense(id, parsed.data);
    if (!expense) return notFound("Expense not found");
    return ok(expense);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/expenses/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    if (!["super_admin", "admin", "finance"].includes(session.user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const { id } = await params;
    const result = await removeExpense(id);
    if (!result) return notFound("Expense not found");
    return noContent();
  } catch (err) {
    return serverError(err);
  }
}
