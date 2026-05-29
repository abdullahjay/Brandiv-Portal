import { Prisma } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import type { CreateLookupInput, UpdateLookupInput } from "@backend/validators/settingsValidator";

// ─── Settings (key-value) ────────────────────────────────────────────────────

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getSetting(key: string): Promise<unknown | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as Parameters<typeof prisma.setting.create>[0]["data"]["value"] },
    update: { value: value as Parameters<typeof prisma.setting.update>[0]["data"]["value"] },
  });
}

export async function upsertManySettings(entries: Record<string, unknown>): Promise<void> {
  await Promise.all(Object.entries(entries).map(([key, value]) => upsertSetting(key, value)));
}

// ─── Lookups (reference data) ─────────────────────────────────────────────────

export async function findAllLookups() {
  return prisma.lookup.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
  });
}

export async function findLookupsByType(type: string) {
  return prisma.lookup.findMany({
    where: { type, active: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
}

export async function createLookup(data: CreateLookupInput) {
  return prisma.lookup.create({
    data: {
      ...data,
      meta: data.meta === null ? Prisma.JsonNull : (data.meta as Prisma.InputJsonValue | undefined),
    },
  });
}

export async function updateLookup(id: string, data: UpdateLookupInput) {
  return prisma.lookup.update({
    where: { id },
    data: {
      ...data,
      meta: data.meta === null ? Prisma.JsonNull : (data.meta as Prisma.InputJsonValue | undefined),
    },
  });
}

export async function deleteLookup(id: string): Promise<void> {
  await prisma.lookup.delete({ where: { id } });
}

export async function lookupExists(id: string): Promise<boolean> {
  return (await prisma.lookup.count({ where: { id } })) > 0;
}
