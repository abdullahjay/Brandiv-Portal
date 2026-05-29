import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@backend/lib/prisma";
import { verifyCredentials } from "@backend/services/authService";
import { loginSchema } from "@backend/validators/authValidator";
import type { UserRole } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  // No adapter needed — Credentials provider + JWT strategy stores sessions in
  // signed cookies only, never in the database.
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await verifyCredentials(
          parsed.data.email,
          parsed.data.password
        );
        return user ?? null;
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — forces re-login each working day
  },

  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as AuthUser).role;
        token.avatarUrl = (user as AuthUser).avatarUrl ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.avatarUrl = token.avatarUrl as string | null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  debug: false,

  secret: process.env.NEXTAUTH_SECRET,
};

// Re-export for server components — avoids importing authOptions everywhere
// cache() deduplicates calls within the same server render tree
import { cache } from "react";
export const getSession = cache(() => getServerSession(authOptions));

// ─── Type augmentation ────────────────────────────────────────────────────────
interface AuthUser {
  id: string;
  role: UserRole;
  avatarUrl: string | null;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      avatarUrl: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    avatarUrl: string | null;
  }
}
