import {
  getAllSettings as repoGetAllSettings,
  getSetting,
  upsertManySettings,
  findAllLookups,
  createLookup,
  updateLookup,
  deleteLookup,
  lookupExists,
} from "@backend/repositories/settingRepository";
import { DEFAULT_FX_RATES } from "@backend/lib/constants";
import type { UpsertSettingsInput, FxRatesInput, CreateLookupInput, UpdateLookupInput } from "@backend/validators/settingsValidator";

export async function getAllSettings() {
  return repoGetAllSettings();
}

export async function upsertSettings(data: UpsertSettingsInput) {
  await upsertManySettings(data as Record<string, unknown>);
  return repoGetAllSettings();
}

export async function getFxRates(): Promise<Record<string, number>> {
  const stored = await getSetting("fx_rates");
  if (stored && typeof stored === "object") return stored as Record<string, number>;
  return { ...DEFAULT_FX_RATES };
}

export async function updateFxRates(rates: FxRatesInput) {
  await upsertManySettings({ fx_rates: rates });
  return rates;
}

export async function listLookups() {
  const rows = await findAllLookups();
  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!grouped[row.type]) grouped[row.type] = [];
    grouped[row.type].push(row);
  }
  return grouped;
}

export async function addLookup(data: CreateLookupInput) {
  return createLookup(data);
}

export async function editLookup(id: string, data: UpdateLookupInput) {
  const exists = await lookupExists(id);
  if (!exists) return null;
  return updateLookup(id, data);
}

export async function removeLookup(id: string): Promise<boolean> {
  const exists = await lookupExists(id);
  if (!exists) return false;
  await deleteLookup(id);
  return true;
}
