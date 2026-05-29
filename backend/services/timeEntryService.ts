import {
  findManyTimeEntries,
  findTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntrySummary,
  type ListTimeEntriesInput,
} from "@backend/repositories/timeEntryRepository";

export async function listTimeEntries(input: ListTimeEntriesInput) {
  return findManyTimeEntries(input);
}

export async function getTimeEntry(id: string) {
  return findTimeEntryById(id);
}

export async function addTimeEntry(data: {
  projectId: string;
  userId: string;
  date: string;
  hours: number;
  description?: string | null;
  billable: boolean;
}) {
  return createTimeEntry(data);
}

export async function editTimeEntry(
  id: string,
  requesterId: string,
  requesterRole: string,
  data: { date?: string; hours?: number; description?: string | null; billable?: boolean }
) {
  const entry = await findTimeEntryById(id);
  if (!entry) throw new Error("Time entry not found");

  const canEdit =
    entry.user.id === requesterId ||
    ["super_admin", "admin", "manager"].includes(requesterRole);

  if (!canEdit) throw new Error("You can only edit your own time entries");

  return updateTimeEntry(id, data);
}

export async function removeTimeEntry(id: string, requesterId: string, requesterRole: string) {
  const entry = await findTimeEntryById(id);
  if (!entry) throw new Error("Time entry not found");

  const canDelete =
    entry.user.id === requesterId ||
    ["super_admin", "admin", "manager"].includes(requesterRole);

  if (!canDelete) throw new Error("You can only delete your own time entries");

  await deleteTimeEntry(id);
}

export async function getTimeSummary(filters: {
  period?: string;
  userId?: string;
  projectId?: string;
}) {
  return getTimeEntrySummary(filters);
}
