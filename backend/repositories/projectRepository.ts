import { prisma } from "@backend/lib/prisma";
import { AMOUNT_MULTIPLIER, DEFAULT_PAGE_SIZE } from "@backend/lib/constants";
import type { CreateProjectInput, UpdateProjectInput, ListProjectsInput } from "@backend/validators/projectValidator";
import type { Prisma, ProjectValueChangeType } from "@prisma/client";

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
  managingPartnerId: true,
  managingPartner: { select: { id: true, name: true } },
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
  upsells: {
    select: {
      id: true,
      title: true,
      description: true,
      billingMode: true,
      status: true,
      amountPkr: true,
      commissionRatePct: true,
      managingCommissionRatePct: true,
      createdAt: true,
      approvedAt: true,
      completedAt: true,
      earnerAccountId: true,
      earnerAccount: { select: { id: true, name: true } },
      managingPartnerId: true,
      managingPartner: { select: { id: true, name: true } },
      commissions: {
        select: { id: true, commissionType: true, commissionPkr: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
  valueChanges: {
    select: {
      id: true,
      changeType: true,
      oldValuePkr: true,
      newValuePkr: true,
      deltaPkr: true,
      oldValueOriginal: true,
      newValueOriginal: true,
      currency: true,
      reason: true,
      notes: true,
      createdAt: true,
      relatedUpsellId: true,
      relatedUpsell: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" as const },
    take: 50,
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

export async function createProject(data: CreateProjectInput, createdById: string | null) {
  const {
    valueOriginal,
    startDate,
    deadline,
    managerId,
    managingPartnerId,
    clientId,
    ...rest
  } = data;

  // Store valueOriginal as BigInt (value × AMOUNT_MULTIPLIER)
  const valueOriginalBigInt = BigInt(Math.round(valueOriginal * AMOUNT_MULTIPLIER));

  // No FX conversion pipeline exists for project value in this codebase (unlike
  // IncomeRecord) — valuePkr mirrors valueOriginal so value-history deltas are meaningful.
  const project = await prisma.project.create({
    data: {
      ...rest,
      valueOriginal: valueOriginalBigInt,
      valuePkr: valueOriginalBigInt,
      clientId,
      managerId: managerId ?? null,
      managingPartnerId: managingPartnerId ?? null,
      startDate: startDate ? new Date(startDate) : null,
      deadline: deadline ? new Date(deadline) : null,
    },
    select: { id: true, currency: true },
  });

  if (valueOriginalBigInt > BigInt(0)) {
    await recordValueChange({
      projectId: project.id,
      changeType: "initial_value",
      oldValuePkr: BigInt(0),
      newValuePkr: valueOriginalBigInt,
      oldValueOriginal: null,
      newValueOriginal: valueOriginalBigInt,
      currency: project.currency,
      createdById,
    });
  }

  return prisma.project.findUnique({ where: { id: project.id }, select: detailSelect });
}

interface ValueChangeOptions {
  changeType?: ProjectValueChangeType;
  reason?: string | null;
  notes?: string | null;
  relatedUpsellId?: string | null;
  createdById?: string | null;
  skipValueLog?: boolean;
}

export async function updateProject(id: string, data: UpdateProjectInput, valueChangeOpts: ValueChangeOptions = {}) {
  const { valueOriginal, startDate, deadline, managerId, managingPartnerId, ...rest } = data;

  const updates: Prisma.ProjectUpdateInput = { ...rest };

  let previous: { valueOriginal: bigint; currency: string } | null = null;
  if (valueOriginal !== undefined) {
    previous = await prisma.project.findUnique({
      where: { id },
      select: { valueOriginal: true, currency: true },
    });
    const newValueOriginalBigInt = BigInt(Math.round(valueOriginal * AMOUNT_MULTIPLIER));
    updates.valueOriginal = newValueOriginalBigInt;
    updates.valuePkr = newValueOriginalBigInt;
  }
  if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
  if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;
  if (managerId !== undefined) updates.manager = managerId ? { connect: { id: managerId } } : { disconnect: true };
  if (managingPartnerId !== undefined) {
    updates.managingPartner = managingPartnerId ? { connect: { id: managingPartnerId } } : { disconnect: true };
  }

  const project = await prisma.project.update({ where: { id }, data: updates, select: detailSelect });

  if (previous !== null && !valueChangeOpts.skipValueLog) {
    const newValueOriginalBigInt = BigInt(Math.round(valueOriginal! * AMOUNT_MULTIPLIER));
    if (newValueOriginalBigInt !== previous.valueOriginal) {
      await recordValueChange({
        projectId: id,
        changeType: valueChangeOpts.changeType ?? "value_correction",
        oldValuePkr: previous.valueOriginal,
        newValuePkr: newValueOriginalBigInt,
        oldValueOriginal: previous.valueOriginal,
        newValueOriginal: newValueOriginalBigInt,
        currency: previous.currency,
        reason: valueChangeOpts.reason ?? null,
        notes: valueChangeOpts.notes ?? null,
        relatedUpsellId: valueChangeOpts.relatedUpsellId ?? null,
        createdById: valueChangeOpts.createdById ?? null,
      });
    }
  }

  return project;
}

export async function projectExists(id: string): Promise<boolean> {
  return !!(await prisma.project.findUnique({ where: { id }, select: { id: true } }));
}

interface RecordValueChangeInput {
  projectId: string;
  changeType: ProjectValueChangeType;
  oldValuePkr: bigint;
  newValuePkr: bigint;
  oldValueOriginal: bigint | null;
  newValueOriginal: bigint | null;
  currency: string;
  reason?: string | null;
  notes?: string | null;
  relatedUpsellId?: string | null;
  createdById?: string | null;
}

export async function recordValueChange(input: RecordValueChangeInput) {
  return prisma.projectValueChange.create({
    data: {
      projectId: input.projectId,
      changeType: input.changeType,
      oldValuePkr: input.oldValuePkr,
      newValuePkr: input.newValuePkr,
      deltaPkr: input.newValuePkr - input.oldValuePkr,
      oldValueOriginal: input.oldValueOriginal,
      newValueOriginal: input.newValueOriginal,
      currency: input.currency,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      relatedUpsellId: input.relatedUpsellId ?? null,
      createdById: input.createdById ?? null,
    },
  });
}
