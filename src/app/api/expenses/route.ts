import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listExpenses, addExpense } from "@backend/services/expenseService";
import { listExpensesSchema, createExpenseSchema } from "@backend/validators/expenseValidator";

// GET /api/expenses
export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listExpensesSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await listExpenses(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/expenses
export async function POST(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    if (!["super_admin", "admin", "finance", "manager"].includes(user.role)) {
      return unauthorized("Insufficient permissions");
    }

    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const expense = await addExpense(parsed.data);
    return created(expense);
  } catch (err) {
    return serverError(err);
  }
}
