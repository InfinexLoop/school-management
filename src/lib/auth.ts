import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const COOKIE = "nga_session";
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 10);
  await db.session.create({ data: { userId, tokenHash: hash(token), expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: { include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }, student: true, guardian: true, employee: true, alumni: true } } } });
  if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/portal");
  return user;
}

export function roleCodes(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>) { return user.roles.map(item => item.role.code); }
export function can(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, permission: string) { return user.roles.some(item => item.role.permissions.some(rp => rp.permission.code === permission)); }

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
  jar.delete(COOKIE);
}
