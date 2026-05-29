import { prisma } from "@backend/lib/prisma";

const include = {
  user: { select: { id: true, name: true, avatarUrl: true } },
  project: {
    select: {
      id: true,
      name: true,
      client: { select: { id: true, companyName: true } },
    },
  },
} as const;

export interface ListTimeEntriesInput {
  period?: string;
  projectId?: string;
  userId?: string;
  billable?: boolean;
  page: number;
  pageSize: number;
}

export async function findManyTimeEntries(input: ListTimeEntriesInput) {
  const where: Record<string, unknown> = {};

  if (input.period) {
    const [year, month] = input.period.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    where.date = { gte: start, lt: end };
  }

  if (input.projectId) where.projectId = input.projectId;
  if (input.userId) where.userId = input.userId;
  if (input.billable !== undefined) where.billable = input.billable;

  const [items, total] = await prisma.$transaction([
    prisma.timeEntry.findMany({
      where,
      include,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.timeEntry.count({ where }),
  ]);

  return {
    items: items.map(serialize),
    total,
    page: input.page,
    pageSize: input.pageSize,
  };
}

export async function findTimeEntryById(id: string) {
  const entry = await prisma.timeEntry.findUnique({ where: { id }, include });
  return entry ? serialize(entry) : null;
}

export async function createTimeEntry(data: {
  projectId: string;
  userId: string;
  date: string;
  hours: number;
  description?: string | null;
  billable: boolean;
}) {
  const entry = await prisma.timeEntry.create({
    data: {
      projectId: data.projectId,
      userId: data.userId,
      date: new Date(data.date),
      hours: data.hours,
      description: data.description ?? null,
      billable: data.billable,
    },
    include,
  });
  return serialize(entry);
}

export async function updateTimeEntry(
  id: string,
  data: {
    date?: string;
    hours?: number;
    description?: string | null;
    billable?: boolean;
  }
) {
  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.hours !== undefined && { hours: data.hours }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.billable !== undefined && { billable: data.billable }),
    },
    include,
  });
  return serialize(entry);
}

export async function deleteTimeEntry(id: string) {
  await prisma.timeEntry.delete({ where: { id } });
}

export async function getTimeEntrySummary(filters: {
  period?: string;
  userId?: string;
  projectId?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters.period) {
    const [year, month] = filters.period.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    where.date = { gte: start, lt: end };
  }

  if (filters.userId) where.userId = filters.userId;
  if (filters.projectId) where.projectId = filters.projectId;

  const result = await prisma.timeEntry.aggregate({
    where,
    _sum: { hours: true },
    _count: { id: true },
  });

  const billable = await prisma.timeEntry.aggregate({
    where: { ...where, billable: true },
    _sum: { hours: true },
  });

  return {
    totalHours: Number(result._sum.hours ?? 0),
    billableHours: Number(billable._sum.hours ?? 0),
    nonBillableHours: Number(result._sum.hours ?? 0) - Number(billable._sum.hours ?? 0),
    entryCount: result._count.id,
  };
}

function serialize(entry: {
  id: string;
  hours: { toNumber: () => number } | number;
  date: Date;
  description: string | null;
  billable: boolean;
  createdAt: Date;
  user: { id: string; name: string; avatarUrl: string | null };
  project: { id: string; name: string; client: { id: string; companyName: string } };
}) {
  return {
    id: entry.id,
    hours: typeof entry.hours === "number" ? entry.hours : entry.hours.toNumber(),
    date: entry.date.toISOString().split("T")[0],
    description: entry.description,
    billable: entry.billable,
    createdAt: entry.createdAt.toISOString(),
    user: entry.user,
    project: entry.project,
  };
}
