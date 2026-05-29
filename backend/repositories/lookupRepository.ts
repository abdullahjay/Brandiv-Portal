import { prisma } from "@backend/lib/prisma";

export async function findLookupsByType(type: string) {
  return prisma.lookup.findMany({
    where: { type, active: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, type: true, value: true, label: true, code: true, meta: true },
  });
}

export async function findAllLookups() {
  return prisma.lookup.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    select: { id: true, type: true, value: true, label: true, code: true, meta: true },
  });
}

export async function createLookup(data: {
  type: string;
  value: string;
  label: string;
  code?: string;
  meta?: object;
  sortOrder?: number;
}) {
  return prisma.lookup.create({ data });
}

export async function updateLookup(
  id: string,
  data: Partial<{ label: string; code: string; meta: object; sortOrder: number; active: boolean }>
) {
  return prisma.lookup.update({ where: { id }, data });
}

export async function upsertLookup(data: {
  type: string;
  value: string;
  label: string;
  code?: string;
  meta?: object;
  sortOrder?: number;
}) {
  return prisma.lookup.upsert({
    where: { type_value: { type: data.type, value: data.value } },
    update: { label: data.label, code: data.code, meta: data.meta as any, sortOrder: data.sortOrder },
    create: data,
  });
}
