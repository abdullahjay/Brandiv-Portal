import { Prisma } from "@prisma/client";
import { prisma } from "@backend/lib/prisma";
import type { UpdateUserInput, ListUsersInput } from "@backend/validators/userValidator";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  lastLogin: true,
  createdAt: true,
} as const;

export async function findAllUsers(input: ListUsersInput) {
  const { search, role, status, page, pageSize } = input;
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: string;
  status?: string;
  avatarUrl?: string | null;
}) {
  return prisma.user.create({ data: data as Parameters<typeof prisma.user.create>[0]["data"], select: USER_SELECT });
}

export async function updateUser(id: string, data: UpdateUserInput & { passwordHash?: string }) {
  const { password: _, ...rest } = data as Record<string, unknown>;
  return prisma.user.update({ where: { id }, data: rest, select: USER_SELECT });
}

export async function userExists(id: string): Promise<boolean> {
  return (await prisma.user.count({ where: { id } })) > 0;
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}
