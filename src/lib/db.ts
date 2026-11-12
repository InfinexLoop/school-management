import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const globalForDb = globalThis as unknown as { db?: PrismaClient };
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });
export const db = globalForDb.db ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForDb.db = db;
