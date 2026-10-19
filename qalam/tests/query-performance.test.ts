import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, runMigrations, type DB } from "@/db";
import { seed } from "@/db/seed";
import * as s from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { getTutorDashboard, getWorkspace, listStudents, searchAll, sessionsBetween } from "@/lib/queries";
import { createSession, logSession } from "@/lib/mutations";
import { computeCoverage } from "@/lib/domain";
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
  it.each(["tutor", "guardian", "student"] as const)("keeps slim roster summaries equivalent to full workspaces for %s", async (role) => {
    const userRow = (await db.query.users.findFirst({ where: eq(s.users.role, role) }))!;
    const student = await db.query.students.findFirst({ where: eq(s.students.userId, userRow.id) });
    const guardian = await db.query.guardians.findFirst({ where: eq(s.guardians.userId, userRow.id) });
    const links = guardian ? await db.query.familyGuardians.findMany({ where: eq(s.familyGuardians.guardianId, guardian.id) }) : [];
    const user: CurrentUser = { id: userRow.id, tutorId: userRow.tutorId, role, displayName: userRow.displayName, email: userRow.email, username: userRow.username, studentId: student?.id, guardianId: guardian?.id, familyIds: student ? [student.familyId] : links.map((link) => link.familyId) };
    const summaries = await listStudents(db, user);
    expect(summaries.length).toBeGreaterThan(0);
    for (const summary of summaries) {
      const ws = await getWorkspace(db, user, summary.id);
      expect(summary).toEqual({
        id: ws.student.id, name: ws.displayName, fullName: `${ws.student.firstName} ${ws.student.lastName}`,
        gradeYear: ws.student.gradeYear, school: ws.student.school, status: ws.student.status, hue: ws.student.avatarHue,
        familyName: ws.family.name, enrolments: ws.enrolments.map((enrolment) => enrolment.subject),
        coverage: computeCoverage(ws.allTopics).percent, pkg: ws.pkg, alerts: ws.alerts, nextSession: ws.nextSession,
        currentTopic: ws.enrolments.map((enrolment) => enrolment.currentTopic?.name).find(Boolean) ?? null,
        startDate: ws.student.startDate,
      });
      if (role !== "tutor" && summary.nextSession) {
        expect(summary.nextSession.privateNotes).toBeNull();
        expect(summary.nextSession.students.map((pupil) => pupil.id)).toEqual([summary.id]);
      }
    }
  });

  it("does not load conversations, files or ancillary workspace data for roster cards", async () => {
    const omittedReads = [
      vi.spyOn(db.query.familyGuardians, "findMany"), vi.spyOn(db.query.schedules, "findMany"),
      vi.spyOn(db.query.subjects, "findMany"), vi.spyOn(db.query.nextSteps, "findMany"),
      vi.spyOn(db.query.feedback, "findMany"), vi.spyOn(db.query.resources, "findMany"),
    ];
    const homeworkReads = vi.spyOn(db.query.homework, "findMany");
    const assessmentReads = vi.spyOn(db.query.assessments, "findMany");
    await listStudents(db, tutor);
    for (const read of omittedReads) expect(read).not.toHaveBeenCalled();
    expect(homeworkReads).toHaveBeenCalledTimes(studentIds.length);
    for (const [query] of homeworkReads.mock.calls) {
      expect(query?.columns).toEqual({ status: true, dueAt: true });
      expect(query?.with).toBeUndefined();
    }
    for (const [query] of assessmentReads.mock.calls) {
      expect(query?.columns).toEqual({ id: true, name: true, date: true });
      expect(query?.with).toEqual({ topics: { columns: { enrolmentTopicId: true, revisionStatus: true } } });
    }
  });

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
    expect(await listStudents(db, outsider)).toEqual([]);
    expect(await searchAll(db, outsider, "a")).toEqual({ students: [], topics: [], homework: [], tests: [], resources: [] });
  });
});
