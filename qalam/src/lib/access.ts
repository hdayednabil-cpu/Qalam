// Server-side authorisation. Every query that touches student data goes
// through these helpers; the UI never decides who may see what.
import { eq, inArray } from "drizzle-orm";
import type { DB } from "@/db";
import { students, type Role, type Visibility } from "@/db/schema";
import type { CurrentUser } from "./auth";

export class Forbidden extends Error {
  constructor(msg = "Forbidden") {
    super(msg);
  }
}

export async function accessibleStudentIds(db: DB, user: CurrentUser): Promise<string[]> {
  if (user.role === "tutor") {
    const rows = await db.select({ id: students.id }).from(students).where(eq(students.tutorId, user.tutorId));
    return rows.map((r) => r.id);
  }
  if (user.role === "student") return user.studentId ? [user.studentId] : [];
  if (!user.familyIds.length) return [];
  const rows = await db.select({ id: students.id }).from(students).where(inArray(students.familyId, user.familyIds));
  return rows.map((r) => r.id);
}

export async function canAccessStudent(db: DB, user: CurrentUser, studentId: string): Promise<boolean> {
  if (user.role === "tutor") {
    const s = await db.query.students.findFirst({ where: eq(students.id, studentId), columns: { tutorId: true } });
    return !!s && s.tutorId === user.tutorId;
  }
  if (user.role === "student") return user.studentId === studentId;
  const s = await db.query.students.findFirst({ where: eq(students.id, studentId), columns: { familyId: true } });
  return !!s && user.familyIds.includes(s.familyId);
}

export async function assertStudentAccess(db: DB, user: CurrentUser, studentId: string) {
  if (!(await canAccessStudent(db, user, studentId))) throw new Forbidden();
}

/** Which visibility levels a role may read. */
export function visibleTo(role: Role): Visibility[] {
  if (role === "tutor") return ["private", "student", "parent", "family"];
  if (role === "student") return ["student", "family"];
  return ["parent", "family"];
}

export function canSee(role: Role, visibility: Visibility) {
  return visibleTo(role).includes(visibility);
}

export function assertTutor(user: CurrentUser) {
  if (user.role !== "tutor") throw new Forbidden("Tutor only");
}
