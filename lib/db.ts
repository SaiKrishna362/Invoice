// ============================================================
// lib/db.ts — Prisma Database Client
//
// Exports a single shared `db` instance used by every
// server action and API route to query the database.
//
// WHY THE GLOBAL TRICK:
//   Next.js dev mode restarts the Node process on every file
//   change, which would create a new PrismaClient on every
//   hot-reload and eventually exhaust the database connection pool.
//   Storing the client on `globalThis` means we reuse the same
//   connection across hot-reloads, but still get a fresh one in
//   production where `globalThis.prisma` starts undefined.
//
// Usage in any server file:
//   import { db } from "@/lib/db";
//   const user = await db.user.findUnique({ where: { id } });
// ============================================================

import "server-only";       // Prevents this module from being imported in client code
import { PrismaClient }     from "@prisma/client";
import { PrismaPg }         from "@prisma/adapter-pg";

// Extend the global type so TypeScript knows about our cached instance
declare global {
  var prisma: PrismaClient | undefined;
}

// Creates a fresh Prisma client connected to the Postgres database
// specified by the DATABASE_URL environment variable
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// Reuse the existing client if one exists (hot-reload safe),
// otherwise create a new one
export const db = globalThis.prisma ?? createPrismaClient();

// Cache the client globally in development so hot-reloads don't
// multiply connections. In production this branch never runs.
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
