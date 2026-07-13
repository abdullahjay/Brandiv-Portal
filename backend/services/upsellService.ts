import {
  listUpsellsByProject,
  getUpsell,
  createUpsell,
  updateUpsell,
  deleteUpsell,
  approveUpsell,
} from "@backend/repositories/upsellRepository";
import { createUpsellSchema, updateUpsellSchema } from "@backend/validators/upsellValidator";
import type { CreateUpsellBody, UpdateUpsellBody } from "@backend/validators/upsellValidator";

export async function getProjectUpsells(projectId: string) {
  return listUpsellsByProject(projectId);
}

export async function createProjectUpsell(projectId: string, body: CreateUpsellBody) {
  const data = createUpsellSchema.parse(body);
  return createUpsell({
    projectId,
    source:          data.source,
    incrementPkr:    BigInt(Math.round(data.incrementPkr)),
    ratePct:         data.ratePct,
    period:          data.period,
    earnerAccountId: data.earnerAccountId,
    description:     data.description,
  });
}

export async function editProjectUpsell(id: string, body: UpdateUpsellBody) {
  const existing = await getUpsell(id);
  if (!existing) throw new Error("Upsell not found");
  if (existing.status !== "pending") throw new Error("Only pending upsells can be edited");

  const data = updateUpsellSchema.parse(body);
  return updateUpsell(id, {
    ...data,
    incrementPkr: data.incrementPkr !== undefined
      ? BigInt(Math.round(data.incrementPkr))
      : undefined,
  });
}

export async function removeProjectUpsell(id: string) {
  const existing = await getUpsell(id);
  if (!existing) throw new Error("Upsell not found");
  if (existing.status !== "pending") throw new Error("Only pending upsells can be deleted");
  return deleteUpsell(id);
}

export async function approveProjectUpsell(id: string) {
  const existing = await getUpsell(id);
  if (!existing) throw new Error("Upsell not found");
  if (existing.status !== "pending") throw new Error(`Upsell is already ${existing.status}`);
  return approveUpsell(id);
}
