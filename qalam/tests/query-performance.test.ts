import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, runMigrations, type DB } from "@/db";
import { seed } from "@/db/seed";
import * as s from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { getTutorDashboard, getWorkspace, listStudents, searchAll, sessionsBetween } from "@/lib/queries";
import { createSession, logSession } from "@/lib/mutations";
import { todayKey, addDaysKey } from "@/lib/dates";
import { newId } from "@/lib/ids";

let db: DB;
let tutor: CurrentUser;
let studentIds: string[];
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "");
  db = await createTestDb();
  await runMigrations(db);
  await seed(db);
  const user = (await db.query.users.findFirst({ where: eq(s.users.email, "nabil@qalam.demo") }))!;
  tutor = { id: user.id, tutorId: user.tutorId, role: "tutor", displayName: user.displayName, email: user.email, username: user.username, familyIds: [] };
  studentIds = (await db.query.students.findMany({ where: eq(s.students.tutorId, user.tutorId) })).map((row) => row.id);
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => vi.unstubAllEnvs());

describe("workspace query performance without stale or overbroad results", () => {
  it("searches each authorised workspace once, preserving sorted student results", async () => {
    const expected = await listStudents(db, tutor);
    const homeworkReads = vi.spyOn(db.query.homework, "findMany");
    const result = await searchAll(db, tutor, "a");
    expect(homeworkReads).toHaveBeenCalledTimes(studentIds.length);
    expect(result.students).toEqual(expected.filter((student) => student.fullName.toLowerCase().includes("a") || student.familyName.toLowerCase().includes("a")));
    expect(result.homework.every((homework) => studentIds.includes(homework.studentId))).toBe(true);
  });

  it("reuses dashboard sessions and counts a completed group lesson once", async () => {
    const id = await createSession(db, tutor, { studentIds: studentIds.slice(0, 2), dateKey: todayKey(), time: "10:00", minutes: 60, mode: "online" });
    await logSession(db, tutor, { sessionId: id, status: "completed", sharedSummary: "Group lesson", perStudent: studentIds.slice(0, 2).map((studentId) => ({ studentId, topics: [] })) });
    const expectedToday = await sessionsBetween(db, tutor, todayKey(), todayKey());
    const expectedWeek = await sessionsBetween(db, tutor, addDaysKey(todayKey(), 1), addDaysKey(todayKey(), 7));
    const sessionReads = vi.spyOn(db.query.sessions, "findMany");
    const dashboard = await getTutorDashboard(db, tutor);
    // One session-detail read per student with lessons, plus one package-usage
    // read per active package. No second calendar round-trip after these reads.
    const nonEmpty = [...dashboard.workspaces.values()].filter((workspace) => workspace.sessions.length).length;
    const withPackage = [...dashboard.workspaces.values()].filter((workspace) => workspace.pkg).length;
    expect(sessionReads).toHaveBeenCalledTimes(nonEmpty + withPackage);
    expect(dashboard.todays).toEqual(expectedToday);
    expect(dashboard.week).toEqual(expectedWeek);
    const uniqueCompleted = new Set([...dashboard.workspaces.values()].flatMap((workspace) => workspace.sessions).filter((session) => session.status === "completed" && session.startsAt >= new Date(addDaysKey(todayKey(), -7) + "T00:00:00+03:00")).map((session) => session.id));
    expect(dashboard.indicators.sessionsThisWeek).toBe(uniqueCompleted.size);
    expect(dashboard.todays.filter((session) => session.id === id)).toHaveLength(1);
  });

  it("prioritises a student's package over a newer shared package and reflects subsequent changes", async () => {
    const student = (await db.query.students.findFirst({ where: eq(s.students.id, studentIds[0]) }))!;
    const personalId = newId();
    const sharedId = newId();
    await db.insert(s.packages).values([
      { id: personalId, tutorId: tutor.tutorId, familyId: student.familyId, studentId: student.id, totalSessions: 8, startedAt: "2030-01-01" },
      { id: sharedId, tutorId: tutor.tutorId, familyId: student.familyId, totalSessions: 20, startedAt: "2031-01-01" },
    ]);
    expect((await getWorkspace(db, tutor, student.id)).pkg?.id).toBe(personalId);
    await db.update(s.packages).set({ active: false }).where(eq(s.packages.studentId, student.id));
    const next = await getWorkspace(db, tutor, student.id);
    expect(next.pkg?.id).toBe(sharedId);
    expect(next.pkg?.shared).toBe(true);
  });

  it("rejects an inaccessible student before launching the parallel workspace reads", async () => {
    const homeworkReads = vi.spyOn(db.query.homework, "findMany");
    const outsider: CurrentUser = { ...tutor, tutorId: "another-tutor" };
    await expect(getWorkspace(db, outsider, studentIds[0])).rejects.toThrow("Forbidden");
    expect(homeworkReads).not.toHaveBeenCalled();
    expect(await searchAll(db, outsider, "a")).toEqual({ students: [], topics: [], homework: [], tests: [], resources: [] });
  });
});
