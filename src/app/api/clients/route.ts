import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listClients, createClient } from "@backend/services/clientService";
import { listClientsSchema, createClientSchema } from "@backend/validators/clientValidator";

// GET /api/clients?status=active&search=techmark&page=1&pageSize=50
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listClientsSchema.safeParse({
      status: searchParams.get("status") ?? "all",
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 50,
    });

    if (!parsed.success) return badRequest("Invalid query params", parsed.error.flatten());

    const result = await listClients(parsed.data);
    return ok(result);
  } catch (err) {
    console.error("[GET /api/clients]", err);
    return serverError();
  }
}

// POST /api/clients
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const client = await createClient(parsed.data, session.user.id);
    return created(client);
  } catch (err) {
    console.error("[POST /api/clients]", err);
    return serverError();
  }
}
