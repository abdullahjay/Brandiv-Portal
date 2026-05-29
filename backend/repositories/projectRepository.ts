import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER, DEFAULT_PAGE_SIZE } from "@backend/lib/constants";
import type { CreateProjectInput, UpdateProjectInput, ListProjectsInput } from "@backend/validators/projectValidator";
import type { Prisma } from "@prisma/client";

const listSelect = {
  id: true,
  name: true,
  type: true,
  status: true,
  currency: true,
  valueOriginal: true,
  valuePkr: true,
  progressPct: true,
  startDate: true,
  deadline: true,
  commissionExempt: true,
  createdAt: true,
  client: { select: { id: true, companyName: true, currency: true } },
  manager: { select: { id: true, name: true } },
  _count: { select: { timeEntries: true, invoices: true, milestones: true } },
} satisfies Prisma.ProjectSelect;

const detailSelect = {
  ...listSelect,
  description: true,
  billingCycleDay: true,
  milestones: {
    select: { id: true, title: true, dueDate: true, completedAt: true, valuePkr: true },
    orderBy: { dueDate: "asc" as const },
  },
  invoices: {
    select: {
      id: true,
      invoiceNumber: true,
      currency: true,
      totalAmount: true,
      status: true,
      issueDate: true,
      dueDate: true,
    },
    orderBy: { issueDate: "desc" as const },
    take: 10,
  },
  timeEntries: {
    select: {
      id: true,
      hours: true,
      description: true,
      date: true,
      billable: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" as const },
    take: 20,
  },
} satisfies Prisma.ProjectSelect;

export async function findManyProjects(input: ListProjectsInput) {
  const { status, type, clientId, search, page, pageSize } = input;

  const where: Prisma.ProjectWhereInput = {
    ...(status !== "all" && { status }),
    ...(type !== "all" && { type }),
    ...(clientId && { clientId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { client: { companyName: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.project.findMany({
      where,
      select: listSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findProjectById(id: string) {
  return prisma.project.findUnique({ where: { id }, select: detailSelect });
}

export async function createProject(data: CreateProjectInput) {
  const {
    valueOriginal,
    startDate,
    deadline,
    managerId,
    clientId,
    ...rest
  } = data;

  // Store valueOriginal as BigInt (value × AMOUNT_MULTIPLIER)
  const valueOriginalBigInt = BigInt(Math.round(valueOriginal * AMOUNT_MULTIPLIER));

  return prisma.project.create({
    data: {
      ...rest,
      valueOriginal: valueOriginalBigInt,
      clientId,
      managerId: managerId ?? null,
      startDate: startDate ? new Date(startDate) : null,
      deadline: deadline ? new Date(deadline) : null,
    },
    select: detailSelect,
  });
}

export async function updateProject(id: string, data: UpdateProjectInput) {
  const { valueOriginal, startDate, deadline, managerId, ...rest } = data;

  const updates: Prisma.ProjectUpdateInput = { ...rest };

  if (valueOriginal !== undefined) {
    updates.valueOriginal = BigInt(Math.round(valueOriginal * AMOUNT_MULTIPLIER));
  }
  if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
  if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;
  if (managerId !== undefined) updates.manager = managerId ? { connect: { id: managerId } } : { disconnect: true };

  return prisma.project.update({ where: { id }, data: updates, select: detailSelect });
}

export async function projectExists(id: string): Promise<boolean> {
  return (await prisma.project.count({ where: { id } })) > 0;
}
