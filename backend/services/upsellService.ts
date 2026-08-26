import { prisma } from "@backend/lib/prisma";
import {
  findManyUpsellsByProject,
  findUpsellById,
  findSelectableUpsellsByProject,
  createUpsell,
  updateUpsell,
  deleteUpsell,
  approveUpsell as approveUpsellRepo,
  cancelUpsell as cancelUpsellRepo,
  markUpsellCompleted,
  markUpsellActive,
  upsellExists,
  upsellHasCommissions,
} from "@backend/repositories/upsellRepository";
import type { CreateUpsellInput, UpdateUpsellInput, ListUpsellsInput } from "@backend/validators/upsellValidator";

export async function listUpsells(projectId: string, input: ListUpsellsInput) {
  return findManyUpsellsByProject(projectId, input);
}

export async function listSelectableUpsells(projectId: string) {
  return findSelectableUpsellsByProject(projectId);
}

export async function getUpsell(id: string) {
  return findUpsellById(id);
}

// Upsells are tracked as their own commissionable line — separate from the
// project's original contract value. Creating/editing/cancelling an upsell
// never touches project.valueOriginal/valuePkr.
export async function addUpsell(projectId: string, data: CreateUpsellInput, createdById: string | null) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return null;

  const upsell = await createUpsell(projectId, data, createdById);
  return findUpsellById(upsell.id);
}

export async function editUpsell(id: string, data: UpdateUpsellInput) {
  const existing = await findUpsellById(id);
  if (!existing) return null;
  if (existing.status !== "pending") {
    throw new Error("Only pending upsells can be edited");
  }
  if (await upsellHasCommissions(id)) {
    throw new Error("Cannot edit an upsell that already has commissions");
  }

  return updateUpsell(id, data);
}

export async function removeUpsell(id: string) {
  const existing = await findUpsellById(id);
  if (!existing) return null;
  if (existing.status !== "pending") {
    throw new Error("Only pending upsells can be deleted — cancel approved/active upsells instead");
  }
  if (await upsellHasCommissions(id)) {
    throw new Error("Cannot delete an upsell that already has commissions");
  }

  await deleteUpsell(id);
  return true;
}

export async function approveUpsell(id: string) {
  const existing = await findUpsellById(id);
  if (!existing) return null;
  if (existing.status !== "pending") {
    throw new Error("Only pending upsells can be approved");
  }
  // Recurring upsells go straight to "active" so they're immediately reusable
  // across future invoices; one-time upsells wait as "approved" until invoiced.
  await approveUpsellRepo(id);
  if (existing.billingMode === "recurring") {
    return markUpsellActive(id);
  }
  return findUpsellById(id);
}

export async function cancelUpsell(id: string) {
  const existing = await findUpsellById(id);
  if (!existing) return null;
  if (!["pending", "approved", "active"].includes(existing.status)) {
    throw new Error("Only pending, approved, or active upsells can be cancelled");
  }
  if (await upsellHasCommissions(id)) {
    throw new Error("Cannot cancel an upsell that already has commissions");
  }

  return cancelUpsellRepo(id);
}

export async function completeUpsell(id: string) {
  const existing = await findUpsellById(id);
  if (!existing) return null;
  if (existing.billingMode !== "one_time") {
    throw new Error("Only one-time upsells can be manually completed");
  }
  if (!["approved", "active"].includes(existing.status)) {
    throw new Error("Only approved or active upsells can be completed");
  }
  return markUpsellCompleted(id);
}

export { upsellExists };
