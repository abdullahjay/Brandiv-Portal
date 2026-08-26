import { type NextRequest } from "next/server";
import { requireApiUser } from "@backend/lib/requestAuth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getClient, updateClient, archiveClient } from "@backend/services/clientService";
import { updateClientSchema } from "@backend/validators/clientValidator";

// GET /api/clients/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const { id } = await params;
    const client = await getClient(id);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    const body = await req.json();
    const parsed = updateClientSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const client = await updateClient(id, parsed.data);
    if (!client) return notFound("Client not found");

    return ok(client);
  } catch (err) {
    console.error("[PUT /api/clients/:id]", err);
    return serverError();
  }
}

// DELETE /api/clients/:id  — soft delete (marks inactive)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireApiUser(req);
    if (!user) return unauthorized();

    // Only admin+ can archive clients
    const role = user.role;
    if (!["super_admin", "admin", "manager"].includes(role)) {
      return unauthorized("Insufficient permissions");
    }

    const { id } = await params;
    const client = await archiveClient(id);
    if (!client) return notFound("Client not found");

    return ok(client);
  } catch (err) {
    console.error("[DELETE /api/clients/:id]", err);
    return serverError();
  }
}
