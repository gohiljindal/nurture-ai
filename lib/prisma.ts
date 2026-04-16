import { PrismaClient } from "@prisma/client";

// One shared client for the whole app. In Next.js dev, hot reload can re-run modules;
// storing the client on `globalThis` avoids opening a new DB connection on every refresh.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
