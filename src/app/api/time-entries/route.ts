import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listTimeEntries, addTimeEntry } from "@backend/services/timeEntryService";
import { listTimeEntriesSchema, createTimeEntrySchema } from "@backend/validators/timeEntryValidator";

// GET /api/time-entries
export async function GET(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listTimeEntriesSchema.safeParse({
      period: searchParams.get("period") ?? undefined,
      projectId: searchParams.get("projectId") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      billable: searchParams.get("billable") ?? undefined,
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 50,
    });

    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const q = parsed.data;

    // Staff/finance can only see their own entries
    if (!["super_admin", "admin", "manager"].includes(user.role)) {
      q.userId = user.id;
    }

    const data = await listTimeEntries(q);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/time-entries
export async function POST(req: Request) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const parsed = createTimeEntrySchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const entry = await addTimeEntry({ ...parsed.data, userId: user.id });
    return created(entry);
  } catch (err) {
    return serverError(err);
  }
}
