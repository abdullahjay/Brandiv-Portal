import bcrypt from "bcryptjs";
import { prisma } from "@backend/lib/prisma";
import type { UserRole } from "@prisma/client";

const BCRYPT_ROUNDS = process.env.NODE_ENV === "production" ? 12 : 10;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
}

/**
 * Verify credentials and return the user if valid.
 * Returns null for any invalid combination — never leaks which field failed.
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      passwordHash: true,
      avatarUrl: true,
    },
  });

  if (!user || !user.passwordHash) return null;
  if (user.status !== "active") return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  // Update last login — non-blocking
  prisma.user
    .update({ where: { id: user.id }, data: { lastLogin: new Date() } })
    .catch(() => {});

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Hash a plain-text password.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Check if a role has access to a given module.
 * Pass "*" to check super-admin wildcard.
 */
export function hasPermission(role: UserRole, module: string): boolean {
  const { ROLE_PERMISSIONS } = require("@backend/lib/constants");
  const allowed: string[] = ROLE_PERMISSIONS[role] ?? [];
  return allowed.includes("*") || allowed.includes(module);
}
