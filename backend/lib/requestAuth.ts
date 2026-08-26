import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import type { UserRole } from "@prisma/client";
import type { SessionUser } from "@frontend/types";

const AUTH_HEADERS = {
  id: "x-auth-user-id",
  name: "x-auth-user-name",
  email: "x-auth-user-email",
  role: "x-auth-user-role",
  avatar: "x-auth-user-avatar",
} as const;

function userFromHeaders(get: (name: string) => string | null): SessionUser | null {
  const id = get(AUTH_HEADERS.id);
  if (!id) return null;

  return {
    id,
    name: get(AUTH_HEADERS.name) ?? "",
    email: get(AUTH_HEADERS.email) ?? "",
    role: (get(AUTH_HEADERS.role) ?? "staff") as UserRole,
    avatarUrl: get(AUTH_HEADERS.avatar) || null,
  };
}

/** Read authenticated user set by middleware (API route handlers). */
export function requireApiUser(req: Request | NextRequest): SessionUser | null {
  return userFromHeaders((name) => req.headers.get(name));
}

/** Read authenticated user set by middleware (server components / layouts). */
export async function getRequestUser(): Promise<SessionUser> {
  const h = await headers();
  const user = userFromHeaders((name) => h.get(name));
  if (!user) {
    throw new Error("Missing auth headers — middleware should authenticate dashboard routes");
  }
  return user;
}

export function authHeaderNames() {
  return AUTH_HEADERS;
}
