import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, badRequest, unauthorized, notFound, serverError } from "@backend/lib/apiResponse";
import { getProject, editProject, archiveProject } from "@backend/services/projectService";
import { updateProjectSchema } from "@backend/validators/projectValidator";

// GET /api/projects/:id
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { id } = await params;
    const project = await getProject(id);
    if (!project) return notFound("Project not found");
    return ok(project);
  } catch (err) {
    return serverError(err);
  }
}

// PUT /api/projects/:id
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { id } = await params;
    const project = await editProject(id, parsed.data);
    if (!project) return notFound("Project not found");
    return ok(project);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/projects/:id — marks as cancelled (soft)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const role = session.user.role;
    if (!["super_admin", "admin", "manager"].includes(role)) {
      return unauthorized("Insufficient permissions");
    }

    const { id } = await params;
    const project = await archiveProject(id);
    if (!project) return notFound("Project not found");
    return ok(project);
  } catch (err) {
    return serverError(err);
  }
}
