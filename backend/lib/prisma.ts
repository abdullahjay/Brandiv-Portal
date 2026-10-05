import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const logLevels: ("error" | "warn")[] =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function createClient() {
  const url = process.env.DATABASE_URL ?? "";

  // Neon (prod): talk to the DB over WebSocket from JS. This avoids Prisma's
  // Rust query-engine process, which kept crashing on Hostinger.
  if (/\.neon\.tech/.test(url)) {
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon(new Pool({ connectionString: url }));
    return new PrismaClient({ adapter, log: logLevels });
  }

  // Local / non-Neon Postgres: regular engine-backed client.
  return new PrismaClient({ log: logLevels });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
