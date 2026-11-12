import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import { env } from "cloudflare:workers";

const adapter = new PrismaD1(env.DB as D1Database);

export const db = new PrismaClient({ adapter });
