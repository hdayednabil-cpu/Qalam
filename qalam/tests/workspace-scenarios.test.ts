import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb, runMigrations, type DB } from "@/db";
import { seed } from "@/db/seed";
import * as s from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { getWorkspace, getHomeworkDetail, getSession, unreadNotifications } from "@/lib/queries";
import { assignHomework, submitHomework, reviewSubmission, createSession, rescheduleSession, setSessionStatus, generateUpcomingSessions, logSession, createAssessment, setRevisionStatus, recordResult, createStudent } from "@/lib/mutations";
import { addDaysKey, todayKey } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { mobileNavigation, routeMatches, workspaceLabel } from "@/lib/navigation";

let db: DB;
let tutor: CurrentUser, student: CurrentUser, parent: CurrentUser;
async function context(identifier: string): Promise<CurrentUser> {
  const u = (await db.query.users.findFirst({ where: identifier.includes("@") ? eq(s.users.email, identifier) : eq(s.users.username, identifier) }))!;
  const st = await db.query.students.findFirst({ where: eq(s.students.userId, u.id) });
  const guardian = await db.query.guardians.findFirst({ where: eq(s.guardians.userId, u.id) });
  const families = guardian ? await db.query.familyGuardians.findMany({ where: eq(s.familyGuardians.guardianId, guardian.id) }) : [];
  return { id: u.id, tutorId: u.tutorId, role: u.role, displayName: u.displayName, email: u.email, username: u.username, studentId: st?.id, guardianId: guardian?.id, familyIds: st ? [st.familyId] : families.map((x) => x.familyId) };
}
beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", "");
  db = await createTestDb(); await runMigrations(db); await seed(db);
  tutor = await context("nabil@qalam.demo"); student = await context("daniel"); parent = await context("sarah.cooper@example.com");
});
afterAll(() => vi.unstubAllEnvs());
async function homework() {
  return assignHomework(db, tutor, { studentId: student.studentId!, title: "Scenario: practise fractions", type: "worksheet", dueAt: new Date(Date.now() + 86400000), priority: "normal", submissionRequirement: "none", topicIds: [] });
}
function review(homeworkId: string, submissionId: string, action: "approve" | "corrections", feedbackVisibility: s.Visibility = "family") {
  return reviewSubmission(db, tutor, { homeworkId, submissionId, action, feedback: "Scenario feedback", feedbackVisibility, pageComments: [], mastery: [] });
}
async function session() {
  return createSession(db, tutor, { studentIds: [student.studentId!], dateKey: addDaysKey(todayKey(), 1), time: "16:00", minutes: 60, mode: "online" });
}

describe("complete learning stories", () => {
  it("assigns, requests corrections, resubmits and approves; both family views agree and the correction task closes", async () => {
    const hw = await homework(); const first = await submitHomework(db, student, hw, [], "First attempt");
    await review(hw, first, "corrections");
    expect((await getHomeworkDetail(db, parent, hw))!.view.status).toBe("corrections_requested");
    const second = await submitHomework(db, student, hw, [], "Corrected attempt");
    await review(hw, second, "approve");
    for (const user of [student, parent]) {
      const detail = (await getHomeworkDetail(db, user, hw))!;
      expect(detail.view.status).toBe("completed");
      expect(detail.view.latestSubmission?.version).toBe(2);
      expect(detail.feedback.some((f) => f.body === "Scenario feedback")).toBe(true);
      expect(detail.ws.nextSteps.filter((step) => step.sourceId === hw)).toEqual([]);
    }
    await expect(submitHomework(db, student, hw, [])).rejects.toThrow("not open");
  });
  it("does not let an old review tab overwrite a newer resubmission", async () => {
    const hw = await homework(); const first = await submitHomework(db, student, hw, []);
    await review(hw, first, "corrections");
    const second = await submitHomework(db, student, hw, []);
    await expect(review(hw, first, "approve")).rejects.toThrow("latest");
    expect((await getHomeworkDetail(db, student, hw))!.view.status).toBe("resubmitted");
    await review(hw, second, "approve");
  });
  it.each(["private", "parent"] as const)("keeps %s review feedback out of student inbox notifications", async (visibility) => {
    const hw = await homework(); const sub = await submitHomework(db, student, hw, []);
    await reviewSubmission(db, tutor, { homeworkId: hw, submissionId: sub, action: "approve", feedback: "Sensitive scenario note", feedbackVisibility: visibility, pageComments: [], mastery: [] });
    const notifications = (await unreadNotifications(db, student.id)).filter((n) => n.link === `/student/homework/${hw}` && n.type === "review");
    expect(notifications).toHaveLength(1);
    expect(notifications[0].body).not.toContain("Sensitive scenario note");
    expect((await getHomeworkDetail(db, student, hw))!.feedback).toEqual([]);
  });
  it("rejects a page comment from another submission without partially completing the homework", async () => {
    const hw = await homework(); const sub = await submitHomework(db, student, hw, []);
    const other = await homework(); const otherSub = await submitHomework(db, student, other, []);
    const fileId = newId(), pageId = newId();
    await db.insert(s.files).values({ id: fileId, tutorId: tutor.tutorId, uploadedByUserId: student.id, storageKey: "scenario.pdf", mimeType: "application/pdf", sizeBytes: 12 });
    await db.insert(s.submissionPages).values({ id: pageId, submissionId: otherSub, fileId, pageOrder: 0 });
    await expect(reviewSubmission(db, tutor, { homeworkId: hw, submissionId: sub, action: "approve", feedback: "", feedbackVisibility: "student", pageComments: [{ submissionPageId: pageId, body: "Wrong page" }], mastery: [] })).rejects.toThrow();
    expect((await getHomeworkDetail(db, student, hw))!.view.status).toBe("submitted");
  });
  it("builds a revision plan, records a result and reflects a weak topic in student and parent progress", async () => {
    const ws = await getWorkspace(db, tutor, student.studentId!); const topic = ws.allTopics[0];
    const assessmentId = await createAssessment(db, tutor, { studentId: student.studentId!, name: "Scenario assessment", date: addDaysKey(todayKey(), 4), priority: "high", topicIds: [topic.id] });
    await setRevisionStatus(db, tutor, assessmentId, topic.id, "revised");
    expect((await getWorkspace(db, student, student.studentId!)).assessments.find((a) => a.id === assessmentId)!.revision.percent).toBe(100);
    await recordResult(db, tutor, { assessmentId, result: "7/10", sharedComment: "Practise the last step", reflection: "Tutor-only reflection", wentWrongTopicIds: [topic.id] });
    for (const user of [student, parent]) {
      const after = await getWorkspace(db, user, student.studentId!);
      expect(after.allTopics.find((t) => t.id === topic.id)!.mastery).toBe("needs_work");
      expect(after.assessments.find((a) => a.id === assessmentId)!.revision.percent).toBe(0);
      expect(JSON.stringify(after.assessments.find((a) => a.id === assessmentId))).not.toContain("Tutor-only reflection");
    }
  });
  it("accepts a typed answer without a photo and rejects an empty answer", async () => {
    const hw = await assignHomework(db, tutor, { studentId: student.studentId!, title: "Explain your method", type: "practice", dueAt: new Date(), priority: "normal", submissionRequirement: "typed", topicIds: [] });
    await expect(submitHomework(db, student, hw, [], "  ")).rejects.toThrow("Write your answer");
    const id = await submitHomework(db, student, hw, [], "I divided both sides by three.");
    const detail = (await getHomeworkDetail(db, student, hw))!;
    expect(detail.view.status).toBe("submitted");
    expect(detail.homework.submissions[0].comment).toBe("I divided both sides by three.");
    await review(hw, id, "approve");
  });
  it("serializes two submission clicks into one persisted version", async () => {
    const hw = await homework();
    const outcomes = await Promise.allSettled([submitHomework(db, student, hw, [], "Attempt"), submitHomework(db, student, hw, [], "Attempt")]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect((await getHomeworkDetail(db, student, hw))!.homework.submissions).toHaveLength(1);
  });
  it("rolls back review changes when a mastery update belongs to a different student", async () => {
    const hw = await homework(); const sub = await submitHomework(db, student, hw, []);
    const other = await context("chris"); const topic = (await getWorkspace(db, tutor, other.studentId!)).allTopics[0];
    await expect(reviewSubmission(db, tutor, { homeworkId: hw, submissionId: sub, action: "approve", feedback: "Must roll back", feedbackVisibility: "family", pageComments: [], mastery: [{ enrolmentTopicId: topic.id, level: "strong" }] })).rejects.toThrow();
    const detail = (await getHomeworkDetail(db, student, hw))!;
    expect(detail.view.status).toBe("submitted"); expect(detail.view.latestSubmission?.outcome).toBe("pending"); expect(detail.feedback).toEqual([]);
  });
  it("creates a first-time learner with an empty, valid workspace", async () => {
    const created = await createStudent(db, tutor, { firstName: "New", lastName: "Learner", guardianName: "Scenario Parent", guardianEmail: "new-scenario@example.com" });
    const ws = await getWorkspace(db, tutor, created.studentId);
    expect(ws.enrolments).toEqual([]); expect(ws.homework).toEqual([]); expect(ws.stats.attendance).toBeNull(); expect(ws.nextSession).toBeNull();
  });
});

describe("scheduling stories", () => {
  it("moves a lesson, routes each role to its own session page and charges only the completed replacement", async () => {
    const before = await getWorkspace(db, tutor, student.studentId!); const original = await session();
    const replacement = await rescheduleSession(db, tutor, original, addDaysKey(todayKey(), 2), "17:00");
    expect((await getWorkspace(db, tutor, student.studentId!)).pkg!.remaining).toBe(before.pkg!.remaining);
    const notices = await db.query.notifications.findMany({ where: and(eq(s.notifications.userId, parent.id), eq(s.notifications.type, "session")) });
    expect(notices.filter((n) => n.title.startsWith("Session moved")).every((n) => n.link === "/parent/sessions")).toBe(true);
    await logSession(db, tutor, { sessionId: replacement, status: "completed", sharedSummary: "Practised fractions", perStudent: [{ studentId: student.studentId!, topics: [] }] });
    expect((await getWorkspace(db, parent, student.studentId!)).pkg!.remaining).toBe(before.pkg!.remaining - 1);
    await setSessionStatus(db, tutor, replacement, "cancelled_by_tutor");
    expect((await getWorkspace(db, parent, student.studentId!)).pkg!.remaining).toBe(before.pkg!.remaining);
  });
  it("does not partially log a lesson when a student outside the session is supplied", async () => {
    const id = await session(); const other = await context("chris");
    await expect(logSession(db, tutor, { sessionId: id, status: "completed", sharedSummary: "Should not save", perStudent: [{ studentId: other.studentId!, topics: [] }] })).rejects.toThrow();
    const stored = (await db.query.sessions.findFirst({ where: eq(s.sessions.id, id) }))!;
    expect(stored.status).toBe("scheduled"); expect(stored.sharedSummary).toBeNull();
  });
  it("rejects empty student selection without creating an orphan calendar event", async () => {
    const before = (await db.query.sessions.findMany()).length;
    await expect(createSession(db, tutor, { studentIds: [], dateKey: todayKey(), time: "16:00", minutes: 60, mode: "online" })).rejects.toThrow();
    expect((await db.query.sessions.findMany()).length).toBe(before);
  });
  it("keeps private lesson notes and other students’ details out of family views", async () => {
    const other = await context("chris");
    const id = await createSession(db, tutor, { studentIds: [student.studentId!, other.studentId!], dateKey: todayKey(), time: "16:00", minutes: 60, mode: "online" });
    await logSession(db, tutor, { sessionId: id, status: "completed", sharedSummary: "Shared lesson", privateNotes: "Private teaching note", perStudent: [{ studentId: student.studentId!, assessment: "Private individual assessment", topics: [] }, { studentId: other.studentId!, topics: [] }] });
    for (const user of [student, parent]) {
      const detail = (await getSession(db, user, id))!;
      expect(detail.privateNotes).toBeNull(); expect(detail.students.map((st) => st.id)).toEqual([student.studentId]);
      expect(detail.students[0].assessment).toBeNull();
      expect(JSON.stringify((await getWorkspace(db, user, student.studentId!)).sessions)).not.toContain("Private teaching note");
    }
    expect((await getSession(db, tutor, id))!.privateNotes).toBe("Private teaching note");
  });
  it("records a no-show for the student and counts the package once", async () => {
    const before = (await getWorkspace(db, tutor, student.studentId!)).pkg!.remaining;
    const id = await session();
    await logSession(db, tutor, { sessionId: id, status: "no_show", sharedSummary: "", perStudent: [{ studentId: student.studentId!, topics: [] }] });
    const after = await getWorkspace(db, parent, student.studentId!);
    expect(after.pkg!.remaining).toBe(before - 1);
    expect(after.sessions.find((session) => session.id === id)!.students[0].attended).toBe(false);
  });
  it("can generate the upcoming schedule twice without duplicates", async () => {
    await generateUpcomingSessions(db, tutor.tutorId, 8);
    const count = (await db.query.sessions.findMany()).length;
    expect(await generateUpcomingSessions(db, tutor.tutorId, 8)).toBe(0);
    expect((await db.query.sessions.findMany()).length).toBe(count);
  });
});

describe("navigation paths", () => {
  it("keeps high-priority routes visible and overflow routes reachable", () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ href: `/route/${i}`, mobile: [0, 1, 4, 6].includes(i) }));
    const { primary, overflow } = mobileNavigation(items);
    expect(primary.map((i) => i.href)).toEqual(["/route/0", "/route/1", "/route/4", "/route/6"]);
    expect(new Set([...primary, ...overflow]).size).toBe(items.length);
    expect(mobileNavigation(items.slice(0, 5)).overflow).toEqual([]);
  });
  it("labels nested details correctly without making the dashboard active everywhere", () => {
    expect(routeMatches("/tutor/sessions/abc", "/tutor")).toBe(false);
    expect(routeMatches("/student/tests/abc", "/student/tests")).toBe(true);
    expect(workspaceLabel("/tutor/sessions/abc", [{ href: "/tutor", label: "Dashboard" }])).toBe("Session details");
    expect(workspaceLabel("/account", [])).toBe("Account settings");
  });
});
