import {
  findLookupsByType,
  findAllLookups,
  createLookup,
  updateLookup,
} from "@backend/repositories/lookupRepository";

export async function getLookupsByType(type: string) {
  return findLookupsByType(type);
}

// Returns all active lookups grouped by type — used by the frontend to load
// everything in one request and cache locally.
export async function getAllLookups() {
  const rows = await findAllLookups();
  return rows.reduce<Record<string, typeof rows>>((acc, row) => {
    if (!acc[row.type]) acc[row.type] = [];
    acc[row.type].push(row);
    return acc;
  }, {});
}

export async function addLookup(data: {
  type: string;
  value: string;
  label: string;
  code?: string;
  meta?: object;
  sortOrder?: number;
}) {
  return createLookup(data);
}

export async function editLookup(
  id: string,
  data: Partial<{ label: string; code: string; meta: object; sortOrder: number; active: boolean }>
) {
  return updateLookup(id, data);
}
