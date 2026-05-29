import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getClient, updateClient, archiveClient } from "@backend/services/clientService";
import { updateClientSchema } from "@backend/validators/clientValidator";

// GET /api/clients/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const client = await getClient(params.id);
    if (!client) return notFound("Client not found");

    return ok(client);
  } catch (err) {
    console.error("[GET /api/clients/:id]", err);
    return serverError();
  }
}

// PUT /api/clients/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const client = await updateClient(params.id, parsed.data);
    if (!client) return notFound("Client not found");

    return ok(client);
  } catch (err) {
    console.error("[PUT /api/clients/:id]", err);
    return serverError();
  }
}

// DELETE /api/clients/:id  — soft delete (marks inactive)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    // Only admin+ can archive clients
    const role = session.user.role;
    if (!["super_admin", "admin", "manager"].includes(role)) {
      return unauthorized("Insufficient permissions");
    }

    const client = await archiveClient(params.id);
    if (!client) return notFound("Client not found");

    return ok(client);
  } catch (err) {
    console.error("[DELETE /api/clients/:id]", err);
    return serverError();
  }
}
