import { getServerSession } from "next-auth";
import { authOptions } from "@backend/lib/auth";
import { ok, created, badRequest, unauthorized, serverError } from "@backend/lib/apiResponse";
import { listProjects, addProject } from "@backend/services/projectService";
import { listProjectsSchema, createProjectSchema } from "@backend/validators/projectValidator";

// GET /api/projects
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(req.url);
    const parsed = listProjectsSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return badRequest("Invalid query parameters", parsed.error.flatten());

    const data = await listProjects(parsed.data);
    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/projects
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorized();

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const project = await addProject(parsed.data);
    return created(project);
  } catch (err) {
    return serverError(err);
  }
}
