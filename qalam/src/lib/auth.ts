import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb, type DB } from "@/db";
import { authSessions, users, students, guardians, familyGuardians, families, type Role } from "@/db/schema";
import { createDatabaseSession } from "./password-security";

export const SESSION_COOKIE = "qalam_session";
export const VIEW_AS_COOKIE = "qalam_view_as";
export const CHILD_COOKIE = "qalam_child";
const SESSION_DAYS = 30;

export type CurrentUser = {
  id: string;
  tutorId: string;
  role: Role;
  displayName: string;
  email: string | null;
  username: string | null;
  studentId?: string;
  guardianId?: string;
  familyIds: string[];
};

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function loadUserContext(db: DB, userId: string): Promise<CurrentUser | null> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u || u.status !== "active") return null;
  const ctx: CurrentUser = { id: u.id, tutorId: u.tutorId, role: u.role, displayName: u.displayName, email: u.email, username: u.username, familyIds: [] };
  if (u.role === "student") {
    const s = await db.query.students.findFirst({ where: eq(students.userId, u.id) });
    if (!s) return null;
    ctx.studentId = s.id;
    ctx.familyIds = [s.familyId];
  } else if (u.role === "guardian") {
    const g = await db.query.guardians.findFirst({ where: eq(guardians.userId, u.id) });
    if (!g) return null;
    ctx.guardianId = g.id;
    const links = await db.select({ familyId: familyGuardians.familyId }).from(familyGuardians).where(eq(familyGuardians.guardianId, g.id));
    ctx.familyIds = links.map((l) => l.familyId);
  }
  return ctx;
}

/** Current user for this request (memoised). Null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const s = await db.query.authSessions.findFirst({ where: and(eq(authSessions.id, token), gt(authSessions.expiresAt, new Date())) });
  if (!s) return null;
  return loadUserContext(db, s.userId);
});

export function homeFor(role: Role) {
  return role === "tutor" ? "/tutor" : role === "guardian" ? "/parent" : "/student";
}

export async function requireUser(role?: Role): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (role && u.role !== role && u.role !== "tutor") redirect(homeFor(u.role));
  return u;
}

export async function createSessionCookie(userId: string, expectedPasswordHash?: string) {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  if (!(await createDatabaseSession(db, { userId, token, expiresAt, expectedPasswordHash }))) return false;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
  return true;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(authSessions).where(eq(authSessions.id, token));
  jar.delete(SESSION_COOKIE);
  jar.delete(VIEW_AS_COOKIE);
  jar.delete(CHILD_COOKIE);
}

/** Simple per-process throttle for login / invitation attempts. */
const attempts = new Map<string, { n: number; until: number }>();
export function throttle(key: string, max = 8, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.until < now) {
    attempts.set(key, { n: 1, until: now + windowMs });
    return true;
  }
  rec.n += 1;
  return rec.n <= max;
}

/**
 * Effective viewer: the real user, or — for the tutor "view as" feature — a
 * synthetic parent/student context. Permissions always use the real user.
 */
export type Viewer = {
  user: CurrentUser;
  effectiveRole: Role;
  studentId?: string;
  familyIds: string[];
  viewingAs?: { role: "guardian" | "student"; label: string };
};

export const getViewer = cache(async (needed: "guardian" | "student"): Promise<Viewer> => {
  const user = await requireUser();
  const jar = await cookies();
  if (user.role === "tutor") {
    const raw = jar.get(VIEW_AS_COOKIE)?.value;
    if (raw) {
      const [role, id] = raw.split(":");
      const db = getDb();
      if (role === "student" && needed === "student") {
        const s = await db.query.students.findFirst({ where: eq(students.id, id) });
        if (s) return { user, effectiveRole: "student", studentId: s.id, familyIds: [s.familyId], viewingAs: { role: "student", label: s.preferredName ?? s.firstName } };
      }
      if (role === "parent" && needed === "guardian") {
        const fam = await db.query.families.findFirst({ where: eq(families.id, id) });
        const famStudents = await db.query.students.findMany({ where: eq(students.familyId, id) });
        if (famStudents.length) return { user, effectiveRole: "guardian", familyIds: [id], viewingAs: { role: "guardian", label: fam?.name ?? "family" } };
      }
    }
    redirect("/tutor");
  }
  if (user.role !== needed) redirect(homeFor(user.role));
  return { user, effectiveRole: user.role, studentId: user.studentId, familyIds: user.familyIds };
});

/** Students a guardian viewer may see (their families' children). */
export async function viewerStudents(v: Viewer) {
  const db = getDb();
  if (!v.familyIds.length) return [];
  return db.query.students.findMany({ where: inArray(students.familyId, v.familyIds), orderBy: (s, { asc }) => [asc(s.firstName)] });
}
