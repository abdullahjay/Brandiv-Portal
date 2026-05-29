import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, forbidden, created, serverError } from "@backend/lib/apiResponse";
import { listUsersSchema, createUserSchema } from "@backend/validators/userValidator";
import { listUsers, addUser } from "@backend/services/userService";
import { prisma } from "@backend/lib/prisma";

// GET /api/users
// Without ?page: returns simple active-user list for dropdowns (all authenticated roles)
// With ?page: returns paginated full list (admin/manager only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);

    if (!searchParams.has("page")) {
      const users = await prisma.user.findMany({
        where: { status: "active" },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        orderBy: { name: "asc" },
      });
      return ok(users);
    }

    const role = session.user.role as string;
    if (!["super_admin", "admin", "manager"].includes(role)) return forbidden();

    const parsed = listUsersSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query", parsed.error.flatten());

    return ok(await listUsers(parsed.data));
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/users — create user (admin/super_admin only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role as string;
    if (!["super_admin", "admin"].includes(role)) return forbidden();

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const user = await addUser(parsed.data);
    return created(user);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) return badRequest(err.message);
    return serverError(err);
  }
}
