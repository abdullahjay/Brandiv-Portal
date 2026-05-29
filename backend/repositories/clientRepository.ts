import { prisma } from "@backend/lib/prisma";
import { DEFAULT_PAGE_SIZE } from "@backend/lib/constants";
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from "@backend/validators/clientValidator";
import type { Prisma } from "@prisma/client";

// Fields returned in list view — minimal joins to keep query fast
const listSelect = {
  id: true,
  companyName: true,
  industry: true,
  contactName: true,
  email: true,
  phone: true,
  country: true,
  currency: true,
  status: true,
  contractStatus: true,
  createdAt: true,
  accountManager: { select: { id: true, name: true } },
  _count: { select: { projects: true, invoices: true } },
} satisfies Prisma.ClientSelect;

// Fields returned in detail view (full)
const detailSelect = {
  ...listSelect,
  website: true,
  timezone: true,
  billingAddress: true,
  taxNumber: true,
  paymentTerms: true,
  ndaRequired: true,
  notes: true,
  source: true,
  commissionRule: true,
  partnerId: true,
  partner: { select: { id: true, name: true, sharePct: true } },
  referredByUserId: true,
  referredBy: { select: { id: true, name: true } },
  projects: {
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      progressPct: true,
      currency: true,
      valueOriginal: true,
      valuePkr: true,
      deadline: true,
    },
    orderBy: { createdAt: "desc" as const },
    take: 10,
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
} satisfies Prisma.ClientSelect;

export async function findManyClients(input: ListClientsInput) {
  const { status, search, page, pageSize } = input;

  const where: Prisma.ClientWhereInput = {
    ...(status !== "all" && { status }),
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.client.findMany({
      where,
      select: listSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    select: detailSelect,
  });
}

export async function createClient(
  data: CreateClientInput,
  createdById: string
) {
  return prisma.client.create({
    data: {
      ...data,
      website: data.website || null,
      createdById,
    },
    select: detailSelect,
  });
}

export async function updateClient(id: string, data: UpdateClientInput) {
  return prisma.client.update({
    where: { id },
    data,
    select: detailSelect,
  });
}

export async function deleteClient(id: string) {
  // Soft delete — mark inactive rather than hard delete
  return prisma.client.update({
    where: { id },
    data: { status: "inactive" },
    select: { id: true, companyName: true, status: true },
  });
}

export async function clientExists(id: string): Promise<boolean> {
  const count = await prisma.client.count({ where: { id } });
  return count > 0;
}
