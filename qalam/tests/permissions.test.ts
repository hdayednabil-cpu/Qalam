import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, runMigrations, type DB } from "@/db";
import * as s from "@/db/schema";
import { seed } from "@/db/seed";
import { canAccessStudent, Forbidden } from "@/lib/access";
import { getWorkspace, getHomeworkDetail } from "@/lib/queries";
import { assignHomework, submitHomework, setMastery, createStudent, checkInvitation, activateInvitation, reviewSubmission } from "@/lib/mutations";
import { sessionCounts, packageUsage } from "@/lib/domain";
import type { CurrentUser } from "@/lib/auth";
import { newId } from "@/lib/ids";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let db: DB;
const users: Record<string, CurrentUser> = {};
const ids: Record<string, string> = {};

async function ctx(identifier: string): Promise<CurrentUser> {
  const u = (await db.query.users.findFirst({ where: identifier.includes("@") ? eq(s.users.email, identifier) : eq(s.users.username, identifier) }))!;
  const c: CurrentUser = { id: u.id, tutorId: u.tutorId, role: u.role, displayName: u.displayName, email: u.email, username: u.username, familyIds: [] };
  if (u.role === "student") {
    const st = (await db.query.students.findFirst({ where: eq(s.students.userId, u.id) }))!;
    c.studentId = st.id;
    c.familyIds = [st.familyId];
  } else if (u.role === "guardian") {
    const g = (await db.query.guardians.findFirst({ where: eq(s.guardians.userId, u.id) }))!;
    c.guardianId = g.id;
    const links = await db.query.familyGuardians.findMany({ where: eq(s.familyGuardians.guardianId, g.id) });
    c.familyIds = links.map((l) => l.familyId);
  }
  return c;
}

beforeAll(async () => {
  process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "qalam-test-"));
  db = await createTestDb();
  await runMigrations(db);
  await seed(db);
  users.tutor = await ctx("nabil@qalam.demo");
  users.ahmed = await ctx("ahmed@qalam.demo");
  users.sarah = await ctx("sarah.cooper@example.com");
  users.daniel = await ctx("daniel");
  users.chris = await ctx("chris");
  users.mohammed = await ctx("mohammed");
  for (const st of await db.query.students.findMany()) ids[st.firstName] = st.id;
});

describe("student access", () => {
  it("guardian sees own children only", async () => {
    expect(await canAccessStudent(db, users.ahmed, ids.Mohammed)).toBe(true);
    expect(await canAccessStudent(db, users.ahmed, ids.Maryam)).toBe(true);
    expect(await canAccessStudent(db, users.ahmed, ids.Daniel)).toBe(false);
    expect(await canAccessStudent(db, users.sarah, ids.Daniel)).toBe(true);
    expect(await canAccessStudent(db, users.sarah, ids.Chris)).toBe(false);
    await expect(getWorkspace(db, users.sarah, ids.Chris)).rejects.toBeInstanceOf(Forbidden);
  });
  it("student sees self only", async () => {
    expect(await canAccessStudent(db, users.daniel, ids.Daniel)).toBe(true);
    expect(await canAccessStudent(db, users.daniel, ids.Chris)).toBe(false);
    await expect(getWorkspace(db, users.chris, ids.Daniel)).rejects.toBeInstanceOf(Forbidden);
  });
  it("tutor sees everyone", async () => {
    for (const id of Object.values(ids)) expect(await canAccessStudent(db, users.tutor, id)).toBe(true);
  });
});

describe("visibility of feedback", () => {
  it("private feedback is hidden from the student and the family", async () => {
    const asTutor = await getWorkspace(db, users.tutor, ids.Daniel);
    const asStudent = await getWorkspace(db, users.daniel, ids.Daniel);
    const asParent = await getWorkspace(db, users.sarah, ids.Daniel);
    expect(asTutor.feedback.some((f) => f.visibility === "private")).toBe(true);
    expect(asStudent.feedback.every((f) => f.visibility === "student" || f.visibility === "family")).toBe(true);
    expect(asParent.feedback.every((f) => f.visibility === "parent" || f.visibility === "family")).toBe(true);
    expect(asStudent.feedback.some((f) => f.visibility === "private")).toBe(false);
  });
});

describe("homework submission", () => {
  it("only the owning student can submit; files must belong to them", async () => {
    const hw = (await db.query.homework.findFirst({ where: eq(s.homework.studentId, ids.Daniel) }))!;
    const open = (await db.query.homework.findMany({ where: eq(s.homework.studentId, ids.Daniel) })).find((h) => h.status === "assigned")!;
    const fileId = newId();
    await db.insert(s.files).values({ id: fileId, tutorId: users.tutor.tutorId, storageKey: "x.jpg", mimeType: "image/jpeg", sizeBytes: 10, uploadedByUserId: users.daniel.id });
    await expect(submitHomework(db, users.sarah, open.id, [fileId])).rejects.toBeInstanceOf(Forbidden);
    await expect(submitHomework(db, users.chris, open.id, [fileId])).rejects.toBeInstanceOf(Forbidden);
    await expect(submitHomework(db, users.tutor, open.id, [fileId])).rejects.toBeInstanceOf(Forbidden);
    const foreignFile = newId();
    await db.insert(s.files).values({ id: foreignFile, tutorId: users.tutor.tutorId, storageKey: "y.jpg", mimeType: "image/jpeg", sizeBytes: 10, uploadedByUserId: users.chris.id });
    await expect(submitHomework(db, users.daniel, open.id, [foreignFile])).rejects.toBeInstanceOf(Forbidden);
    await expect(submitHomework(db, users.daniel, open.id, ["missing-file"])).rejects.toBeInstanceOf(Forbidden);
    await expect(submitHomework(db, users.daniel, open.id, [fileId, fileId])).rejects.toThrow("Duplicate pages");
    await expect(submitHomework(db, users.daniel, open.id, Array(21).fill(fileId))).rejects.toThrow("Maximum 20 pages");
    const subId = await submitHomework(db, users.daniel, open.id, [fileId], "done");
    expect(subId).toBeTruthy();
    const after = (await db.query.homework.findFirst({ where: eq(s.homework.id, open.id) }))!;
    expect(after.status).toBe("submitted");
    expect(hw.id).toBeTruthy();
    // Review only by the tutor; corrections bump status and create a next step.
    await expect(reviewSubmission(db, users.sarah, { homeworkId: open.id, submissionId: subId, action: "corrections", feedback: "x", feedbackVisibility: "student", pageComments: [], mastery: [] })).rejects.toBeInstanceOf(Forbidden);
    await reviewSubmission(db, users.tutor, { homeworkId: open.id, submissionId: subId, action: "corrections", feedback: "Try Q3 again", feedbackVisibility: "student", pageComments: [], mastery: [] });
    const detail = await getHomeworkDetail(db, users.daniel, open.id);
    expect(detail!.view.status).toBe("corrections_requested");
    const resub = await submitHomework(db, users.daniel, open.id, [fileId], "fixed");
    expect((await db.query.submissions.findFirst({ where: eq(s.submissions.id, resub) }))!.version).toBe(2);
  });
});

describe("tutor-only mutations", () => {
  it("rejects guardians and students", async () => {
    const et = (await db.query.enrolmentTopics.findFirst())!;
    await expect(setMastery(db, users.ahmed, ids.Mohammed, et.id, "strong", "manual")).rejects.toBeInstanceOf(Forbidden);
    await expect(setMastery(db, users.mohammed, ids.Mohammed, et.id, "strong", "manual")).rejects.toBeInstanceOf(Forbidden);
    await expect(assignHomework(db, users.sarah, { studentId: ids.Daniel, title: "x", type: "worksheet", dueAt: new Date(), priority: "normal", topicIds: [] })).rejects.toBeInstanceOf(Forbidden);
  });
  it("tutor cannot set mastery on a topic belonging to another student", async () => {
    const ws = await getWorkspace(db, users.tutor, ids.Chris);
    await expect(setMastery(db, users.tutor, ids.Daniel, ws.allTopics[0].id, "strong", "manual")).rejects.toBeInstanceOf(Forbidden);
  });
});

describe("package counting", () => {
  const base = new Date("2026-09-20T13:00:00Z");
  it("applies the late-cancellation rule", () => {
    expect(sessionCounts({ status: "completed", startsAt: base, cancelledAt: null, countsAgainstPackage: null }, 24)).toBe(true);
    expect(sessionCounts({ status: "no_show", startsAt: base, cancelledAt: null, countsAgainstPackage: null }, 24)).toBe(true);
    expect(sessionCounts({ status: "cancelled_by_tutor", startsAt: base, cancelledAt: new Date(base.getTime() - 3600000), countsAgainstPackage: null }, 24)).toBe(false);
    expect(sessionCounts({ status: "cancelled_by_family", startsAt: base, cancelledAt: new Date(base.getTime() - 6 * 3600000), countsAgainstPackage: null }, 24)).toBe(true);
    expect(sessionCounts({ status: "cancelled_by_family", startsAt: base, cancelledAt: new Date(base.getTime() - 48 * 3600000), countsAgainstPackage: null }, 24)).toBe(false);
    expect(sessionCounts({ status: "cancelled_by_family", startsAt: base, cancelledAt: new Date(base.getTime() - 6 * 3600000), countsAgainstPackage: false }, 24)).toBe(false);
    expect(sessionCounts({ status: "rescheduled", startsAt: base, cancelledAt: null, countsAgainstPackage: null }, 24)).toBe(false);
    expect(packageUsage(8, [{ status: "completed", startsAt: base, cancelledAt: null, countsAgainstPackage: null }], 24).remaining).toBe(7);
  });
  it("seeded Daniel has 2 sessions left on his package", async () => {
    const ws = await getWorkspace(db, users.tutor, ids.Daniel);
    expect(ws.pkg?.remaining).toBe(2);
    expect(ws.pkg?.low).toBe(true);
  });
});

describe("invitations", () => {
  it("guardian must activate before the student, and codes are single-use", async () => {
    const res = await createStudent(db, users.tutor, { firstName: "Test", lastName: "Kid", guardianName: "Test Parent", guardianEmail: "tp@example.com" });
    const g = res.codes.find((c) => c.role === "guardian")!.code;
    const st = res.codes.find((c) => c.role === "student")!.code;
    const check1 = await checkInvitation(db, st);
    expect(check1.ok && check1.needsGuardianFirst).toBe(true);
    await expect(activateInvitation(db, st, { username: "testkid", password: "password123" })).rejects.toThrow("guardianFirst");
    await activateInvitation(db, g, { email: "tp@example.com", password: "password123" });
    const check2 = await checkInvitation(db, st);
    expect(check2.ok && !check2.needsGuardianFirst).toBe(true);
    await activateInvitation(db, st, { username: "testkid", password: "password123" });
    expect((await checkInvitation(db, st)).ok).toBe(false); // used
    expect((await checkInvitation(db, "NAB-NOPE-000000")).ok).toBe(false);
    const parent = await ctx("tp@example.com");
    expect(await canAccessStudent(db, parent, res.studentId)).toBe(true);
    expect(await canAccessStudent(db, parent, ids.Daniel)).toBe(false);
  });
});
