import {
  findManyProjects,
  findProjectById,
  createProject,
  updateProject,
  projectExists,
} from "@backend/repositories/projectRepository";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ListProjectsInput,
} from "@backend/validators/projectValidator";

export async function listProjects(input: ListProjectsInput) {
  return findManyProjects(input);
}

export async function getProject(id: string) {
  return findProjectById(id);
}

export async function addProject(data: CreateProjectInput, createdById: string | null = null) {
  return createProject(data, createdById);
}

interface EditProjectOptions {
  createdById?: string | null;
  changeType?: "value_correction" | "manual_adjustment";
  reason?: string | null;
  notes?: string | null;
}

export async function editProject(id: string, data: UpdateProjectInput, opts: EditProjectOptions = {}) {
  const exists = await projectExists(id);
  if (!exists) return null;
  return updateProject(id, data, opts);
}

export async function archiveProject(id: string) {
  const exists = await projectExists(id);
  if (!exists) return null;
  return updateProject(id, { status: "cancelled" });
}
