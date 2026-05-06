// ============================================
// lib/db.ts — Database Connection
//
// Sets up a single Prisma client instance.
// We reuse one connection instead of creating
// a new one on every request (especially important
// in Next.js dev mode which reloads frequently).
// ============================================

import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
