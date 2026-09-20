"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import type { Mastery, RevisionStatus, SessionStatus, Visibility } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import * as m from "@/lib/mutations";
import { zonedToUtc } from "@/lib/dates";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const all = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);

async function tutor() {
  const u = await requireUser("tutor");
  if (u.role !== "tutor") redirect("/");
  return u;
}

export async function logSessionAction(fd: FormData) {
  const user = await tutor();
  const db = getDb();
  const sessionId = str(fd, "sessionId");
  const studentIds = all(fd, "studentId");
  const perStudent = studentIds.map((sid) => {
    const topicIds = all(fd, `topics:${sid}`);
    return {
      studentId: sid,
      assessment: str(fd, `assessment:${sid}`),
      topics: topicIds.map((tid) => ({ enrolmentTopicId: tid, mastery: (str(fd, `mastery:${sid}:${tid}`) || null) as Mastery | null, note: str(fd, `note:${sid}:${tid}`) })),
    };
  });
  const quickHomework = studentIds
    .filter((sid) => str(fd, `hw:${sid}:title`))
    .map((sid) => ({ studentId: sid, title: str(fd, `hw:${sid}:title`), dueInDays: Number(str(fd, `hw:${sid}:due`) || 3), instructions: str(fd, `hw:${sid}:instructions`), topicIds: all(fd, `topics:${sid}`) }));
  await m.logSession(db, user, { sessionId, status: str(fd, "status") === "no_show" ? "no_show" : "completed", sharedSummary: str(fd, "sharedSummary"), privateNotes: str(fd, "privateNotes"), planForNext: str(fd, "planForNext"), perStudent, quickHomework, nextStepsDone: all(fd, "stepDone") });
  revalidatePath("/tutor");
  redirect(studentIds.length === 1 ? `/tutor/students/${studentIds[0]}` : "/tutor");
}

export async function sessionStatusAction(fd: FormData) {
  const user = await tutor();
  const override = str(fd, "override");
  await m.setSessionStatus(getDb(), user, str(fd, "sessionId"), str(fd, "status") as SessionStatus, { reason: str(fd, "reason"), override: override === "" ? undefined : override === "null" ? null : override === "true" });
  revalidatePath("/tutor");
  const back = str(fd, "back");
  if (back) redirect(back);
}

export async function rescheduleAction(fd: FormData) {
  const user = await tutor();
  await m.rescheduleSession(getDb(), user, str(fd, "sessionId"), str(fd, "date"), str(fd, "time"));
  revalidatePath("/tutor");
  redirect(str(fd, "back") || "/tutor/calendar");
}

export async function createSessionAction(fd: FormData) {
  const user = await tutor();
  await m.createSession(getDb(), user, { studentIds: all(fd, "studentId"), dateKey: str(fd, "date"), time: str(fd, "time"), minutes: Number(str(fd, "minutes") || 60), mode: (str(fd, "mode") || "in_person") as "in_person" | "online", location: str(fd, "location"), meetingLink: str(fd, "meetingLink") });
  revalidatePath("/tutor");
  redirect(str(fd, "back") || "/tutor/calendar");
}

export async function generateSessionsAction() {
  const user = await tutor();
  await m.generateUpcomingSessions(getDb(), user.tutorId, 8);
  revalidatePath("/tutor");
}

export async function blackoutAction(fd: FormData) {
  const user = await tutor();
  if (str(fd, "remove")) await m.removeBlackout(getDb(), user, str(fd, "remove"));
  else await m.addBlackout(getDb(), user, str(fd, "start"), str(fd, "end"), str(fd, "reason"));
  revalidatePath("/tutor/calendar");
}

export async function assignHomeworkAction(fd: FormData) {
  const user = await tutor();
  const studentId = str(fd, "studentId");
  await m.assignHomework(getDb(), user, {
    studentId,
    sessionId: str(fd, "sessionId") || undefined,
    title: str(fd, "title"),
    type: str(fd, "type") || "worksheet",
    instructions: str(fd, "instructions"),
    dueAt: zonedToUtc(str(fd, "dueDate"), str(fd, "dueTime") || "20:00"),
    priority: (str(fd, "priority") || "normal") as "low" | "normal" | "high",
    estimatedMinutes: Number(str(fd, "estimatedMinutes")) || undefined,
    submissionRequirement: (str(fd, "submissionRequirement") || "photos") as "photos" | "typed" | "none",
    topicIds: all(fd, "topicId"),
    links: [{ label: str(fd, "linkLabel"), url: str(fd, "linkUrl") }],
  });
  revalidatePath("/tutor");
  redirect(`/tutor/students/${studentId}#homework`);
}

export async function reviewAction(fd: FormData) {
  const user = await tutor();
  const homeworkId = str(fd, "homeworkId");
  const pageIds = all(fd, "pageId");
  const topicIds = all(fd, "topicId");
  await m.reviewSubmission(getDb(), user, {
    homeworkId,
    submissionId: str(fd, "submissionId"),
    action: str(fd, "action") === "corrections" ? "corrections" : "approve",
    feedback: str(fd, "feedback"),
    feedbackVisibility: (str(fd, "visibility") || "student") as Visibility,
    score: str(fd, "score"),
    pageComments: pageIds.map((id) => ({ submissionPageId: id, body: str(fd, `page:${id}`) })),
    mastery: topicIds.map((id) => ({ enrolmentTopicId: id, level: str(fd, `mastery:${id}`) as Mastery })).filter((x) => x.level),
  });
  revalidatePath("/tutor");
  redirect(`/tutor/homework/${homeworkId}`);
}

export async function createAssessmentAction(fd: FormData) {
  const user = await tutor();
  const studentId = str(fd, "studentId");
  const id = await m.createAssessment(getDb(), user, { studentId, name: str(fd, "name"), date: str(fd, "date"), subjectId: str(fd, "subjectId") || undefined, notes: str(fd, "notes"), priority: (str(fd, "priority") || "normal") as "low" | "normal" | "high", topicIds: all(fd, "topicId") });
  revalidatePath("/tutor");
  redirect(`/tutor/tests/${id}`);
}

export async function revisionStatusAction(fd: FormData) {
  const user = await tutor();
  const status = str(fd, "status");
  await m.setRevisionStatus(getDb(), user, str(fd, "assessmentId"), str(fd, "topicId"), (status === "auto" ? null : status) as RevisionStatus | null);
  revalidatePath("/tutor");
}

export async function recordResultAction(fd: FormData) {
  const user = await tutor();
  const assessmentId = str(fd, "assessmentId");
  await m.recordResult(getDb(), user, { assessmentId, result: str(fd, "result"), reflection: str(fd, "reflection"), sharedComment: str(fd, "sharedComment"), wentWrongTopicIds: all(fd, "wentWrong") });
  revalidatePath("/tutor");
  redirect(`/tutor/tests/${assessmentId}`);
}

export async function masteryAction(fd: FormData) {
  const user = await tutor();
  await m.setMastery(getDb(), user, str(fd, "studentId"), str(fd, "topicId"), str(fd, "level") as Mastery, "manual", undefined, str(fd, "note") || undefined);
  revalidatePath("/tutor");
}

export async function currentTopicAction(fd: FormData) {
  const user = await tutor();
  await m.setCurrentTopic(getDb(), user, str(fd, "studentId"), str(fd, "topicId"));
  revalidatePath("/tutor");
}

export async function topicScopeAction(fd: FormData) {
  const user = await tutor();
  await m.setTopicScope(getDb(), user, str(fd, "studentId"), str(fd, "topicId"), str(fd, "inScope") === "true");
  revalidatePath("/tutor");
}

export async function nextStepAction(fd: FormData) {
  const user = await tutor();
  const db = getDb();
  if (str(fd, "done")) await m.completeNextStep(db, user, str(fd, "done"));
  else await m.addNextStep(db, user, str(fd, "studentId"), str(fd, "text"));
  revalidatePath("/tutor");
}

export async function feedbackAction(fd: FormData) {
  const user = await tutor();
  await m.addFeedback(getDb(), user, { studentId: str(fd, "studentId"), body: str(fd, "body"), visibility: (str(fd, "visibility") || "family") as Visibility, important: !!fd.get("important"), targetType: (str(fd, "targetType") || "general") as "general" | "session" | "homework" | "assessment", targetId: str(fd, "targetId") || undefined });
  revalidatePath("/tutor");
}

export async function invitationAction(fd: FormData) {
  const user = await tutor();
  const db = getDb();
  if (str(fd, "revoke")) await m.revokeInvitation(db, user, str(fd, "revoke"));
  else if (str(fd, "guardianId")) await m.createInvitation(db, user, { role: "guardian", guardianId: str(fd, "guardianId") });
  else if (str(fd, "studentId")) await m.createInvitation(db, user, { role: "student", studentId: str(fd, "studentId") });
  revalidatePath("/tutor");
}

export async function accountAction(fd: FormData) {
  const user = await tutor();
  const db = getDb();
  const userId = str(fd, "userId");
  const op = str(fd, "op");
  if (op === "deactivate") await m.setUserStatus(db, user, userId, "deactivated");
  if (op === "reactivate") await m.setUserStatus(db, user, userId, "active");
  if (op === "reset") await m.resetPassword(db, user, userId, str(fd, "password"));
  revalidatePath("/tutor/invitations");
}

export async function createStudentAction(fd: FormData) {
  const user = await tutor();
  const res = await m.createStudent(getDb(), user, {
    firstName: str(fd, "firstName"), lastName: str(fd, "lastName"), preferredName: str(fd, "preferredName"), school: str(fd, "school"), gradeYear: str(fd, "gradeYear"),
    familyId: str(fd, "familyId") || undefined, familyName: str(fd, "familyName"), guardianName: str(fd, "guardianName"), guardianEmail: str(fd, "guardianEmail"), guardianPhone: str(fd, "guardianPhone"),
    templateId: str(fd, "templateId") || undefined, weekday: str(fd, "weekday") === "" ? undefined : Number(str(fd, "weekday")), time: str(fd, "time") || undefined, minutes: Number(str(fd, "minutes")) || 60,
    mode: (str(fd, "mode") || "in_person") as "in_person" | "online", packageSessions: Number(str(fd, "packageSessions")) || undefined,
  });
  revalidatePath("/tutor");
  redirect(`/tutor/students/${res.studentId}`);
}

export async function updateStudentAction(fd: FormData) {
  const user = await tutor();
  const db = getDb();
  const { eq } = await import("drizzle-orm");
  const { students } = await import("@/db/schema");
  const id = str(fd, "studentId");
  const st = await db.query.students.findFirst({ where: eq(students.id, id) });
  if (!st || st.tutorId !== user.tutorId) redirect("/tutor");
  await db.update(students).set({ academicNotes: str(fd, "academicNotes") || null, importantNote: str(fd, "importantNote") || null, status: (str(fd, "status") || st.status) as typeof st.status }).where(eq(students.id, id));
  revalidatePath("/tutor");
}

export async function enrolAction(fd: FormData) {
  const user = await tutor();
  await m.enrolStudent(getDb(), user, str(fd, "studentId"), str(fd, "templateId"));
  revalidatePath("/tutor");
}

export async function importCurriculumAction(fd: FormData) {
  const user = await tutor();
  await m.importCurriculum(getDb(), user, { name: str(fd, "name"), subjectId: str(fd, "subjectId"), board: str(fd, "board"), level: str(fd, "level"), text: str(fd, "text") });
  revalidatePath("/tutor/curriculum");
}

export async function markReadAction() {
  const user = await requireUser();
  await m.markNotificationsRead(getDb(), user.id);
  revalidatePath("/");
}
