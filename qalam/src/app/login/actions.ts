"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSessionCookie, destroySession, homeFor, verifyPassword, throttle, VIEW_AS_COOKIE, requireUser, CHILD_COOKIE } from "@/lib/auth";
import { demoEnabled } from "@/lib/bootstrap";

export async function login(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { error: "invalid" };
  if (!throttle(`login:${identifier}`, 8)) return { error: "throttled" };
  const db = getDb();
  const u = await db.query.users.findFirst({ where: or(eq(users.email, identifier), eq(users.username, identifier)) });
  if (!u || u.status !== "active" || !(await verifyPassword(password, u.passwordHash))) return { error: "invalid" };
  await createSessionCookie(u.id);
  redirect(homeFor(u.role));
}

/** Demo shortcuts, only when DEMO_LOGINS=true. */
export async function demoLogin(formData: FormData) {
  if (!demoEnabled()) redirect("/login");
  const who = String(formData.get("who"));
  const identifier = who === "tutor" ? "nabil@qalam.demo" : who === "parent" ? "ahmed@qalam.demo" : "daniel";
  const db = getDb();
  const u = await db.query.users.findFirst({ where: or(eq(users.email, identifier), eq(users.username, identifier)) });
  if (!u) redirect("/login?error=seed");
  await createSessionCookie(u.id);
  redirect(homeFor(u.role));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setViewAs(formData: FormData) {
  const user = await requireUser("tutor");
  if (user.role !== "tutor") redirect("/");
  const role = String(formData.get("role"));
  const id = String(formData.get("id"));
  const jar = await cookies();
  jar.set(VIEW_AS_COOKIE, `${role}:${id}`, { httpOnly: true, sameSite: "lax", path: "/" });
  if (role === "parent") jar.delete(CHILD_COOKIE);
  redirect(role === "student" ? "/student" : "/parent");
}

export async function clearViewAs() {
  const jar = await cookies();
  jar.delete(VIEW_AS_COOKIE);
  jar.delete(CHILD_COOKIE);
  redirect("/tutor");
}
