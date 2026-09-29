import { MAX_PAGES } from "./upload-limits";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DB } from "@/db";
import * as s from "@/db/schema";
import type { CurrentUser } from "./auth";
import { assertStudentAccess, assertTutor, Forbidden } from "./access";
import { newId, invitationCode } from "./ids";
import { addDaysKey, isInBlackout, todayKey, weekdayOf, zonedToUtc, formatDayShort, formatTime } from "./dates";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Notifications & audit
// ---------------------------------------------------------------------------

export async function notify(db: DB, userIds: (string | null | undefined)[], n: { type: string; title: string; body?: string; link?: string }) {
  const ids = userIds.filter((x): x is string => !!x);
  if (!ids.length) return;
  await db.insert(s.notifications).values(ids.map((userId) => ({ id: newId(), userId, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null })));
}

export async function guardianUserIds(db: DB, familyId: string) {
  const links = await db.query.familyGuardians.findMany({ where: eq(s.familyGuardians.familyId, familyId), with: { guardian: true } });
  return links.map((l) => l.guardian.userId);
}

export async function tutorUserId(db: DB, tutorId: string) {
  const u = await db.query.users.findFirst({ where: and(eq(s.users.tutorId, tutorId), eq(s.users.role, "tutor")) });
  return u?.id ?? null;
}

async function audit(db: DB, user: CurrentUser, action: string, entityType: string, entityId?: string, details?: Record<string, unknown>) {
  await db.insert(s.auditLog).values({ id: newId(), tutorId: user.tutorId, actorUserId: user.id, action, entityType, entityId: entityId ?? null, details: details ?? null });
}

// ---------------------------------------------------------------------------
// Mastery — single write path so coverage, revision and progress stay in sync
// ---------------------------------------------------------------------------

export async function setMastery(db: DB, user: CurrentUser, studentId: string, enrolmentTopicId: string, level: s.Mastery, source: "session" | "homework" | "assessment" | "manual", sourceId?: string, note?: string) {
  assertTutor(user);
  await assertStudentAccess(db, user, studentId);
  const et = await db.query.enrolmentTopics.findFirst({ where: eq(s.enrolmentTopics.id, enrolmentTopicId), with: { enrolment: true } });
  if (!et || et.enrolment.studentId !== studentId) throw new Forbidden("Topic does not belong to student");
  const now = new Date();
  await db
    .insert(s.topicMastery)
    .values({ id: newId(), studentId, enrolmentTopicId, level, source, sourceId: sourceId ?? null, updatedAt: now })
    .onConflictDoUpdate({ target: [s.topicMastery.studentId, s.topicMastery.enrolmentTopicId], set: { level, source, sourceId: sourceId ?? null, updatedAt: now } });
  await db.insert(s.topicMasteryHistory).values({ id: newId(), studentId, enrolmentTopicId, level, source, sourceId: sourceId ?? null, note: note ?? null, recordedAt: now });
}

export async function setCurrentTopic(db: DB, user: CurrentUser, studentId: string, enrolmentTopicId: string) {
  assertTutor(user);
  await assertStudentAccess(db, user, studentId);
  const et = await db.query.enrolmentTopics.findFirst({ where: eq(s.enrolmentTopics.id, enrolmentTopicId), with: { enrolment: true } });
  if (!et || et.enrolment.studentId !== studentId) throw new Forbidden();
  await db.update(s.enrolmentTopics).set({ isCurrent: false }).where(eq(s.enrolmentTopics.enrolmentId, et.enrolmentId));
  await db.update(s.enrolmentTopics).set({ isCurrent: true }).where(eq(s.enrolmentTopics.id, enrolmentTopicId));
}

export async function setTopicScope(db: DB, user: CurrentUser, studentId: string, enrolmentTopicId: string, inScope: boolean) {
  assertTutor(user);
  await assertStudentAccess(db, user, studentId);
  await db.update(s.enrolmentTopics).set({ inScope }).where(eq(s.enrolmentTopics.id, enrolmentTopicId));
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type SessionLogInput = {
  sessionId: string;
  status: "completed" | "no_show";
  sharedSummary: string;
  privateNotes?: string;
  planForNext?: string;
  perStudent: { studentId: string; assessment?: string; attended?: boolean; topics: { enrolmentTopicId: string; mastery: s.Mastery | null; note?: string }[] }[];
  quickHomework?: { studentId: string; title: string; dueInDays: number; instructions?: string; topicIds: string[] }[];
  nextStepsDone?: string[];
};

export async function logSession(db: DB, user: CurrentUser, input: SessionLogInput) {
  assertTutor(user);
  const sess = await db.query.sessions.findFirst({ where: eq(s.sessions.id, input.sessionId), with: { sessionStudents: true } });
  if (!sess || sess.tutorId !== user.tutorId) throw new Forbidden();
  const allowed = new Set(sess.sessionStudents.map((x) => x.studentId));
  await db
    .update(s.sessions)
    .set({ status: input.status, sharedSummary: input.sharedSummary || null, privateNotes: input.privateNotes || null, planForNext: input.planForNext || null, loggedAt: new Date() })
    .where(eq(s.sessions.id, sess.id));
  await db.delete(s.sessionTopics).where(eq(s.sessionTopics.sessionId, sess.id));
  for (const ps of input.perStudent) {
    if (!allowed.has(ps.studentId)) throw new Forbidden();
    await db.update(s.sessionStudents).set({ attended: input.status === "completed" ? (ps.attended ?? true) : false, assessment: ps.assessment || null }).where(and(eq(s.sessionStudents.sessionId, sess.id), eq(s.sessionStudents.studentId, ps.studentId)));
    for (const tp of ps.topics) {
      await db.insert(s.sessionTopics).values({ id: newId(), sessionId: sess.id, studentId: ps.studentId, enrolmentTopicId: tp.enrolmentTopicId, masteryLevel: tp.mastery, note: tp.note ?? null });
      if (tp.mastery) await setMastery(db, user, ps.studentId, tp.enrolmentTopicId, tp.mastery, "session", sess.id);
    }
    // Plan for next session becomes a next step (the tutor's second brain).
    if (input.planForNext?.trim()) {
      const existing = await db.query.nextSteps.findFirst({ where: and(eq(s.nextSteps.studentId, ps.studentId), eq(s.nextSteps.sourceId, sess.id)) });
      if (existing) await db.update(s.nextSteps).set({ text: input.planForNext.trim() }).where(eq(s.nextSteps.id, existing.id));
      else await db.insert(s.nextSteps).values({ id: newId(), studentId: ps.studentId, text: input.planForNext.trim(), source: "session", sourceId: sess.id });
    }
    const st = await db.query.students.findFirst({ where: eq(s.students.id, ps.studentId) });
    if (st && input.status === "completed") {
      await notify(db, [st.userId], { type: "session", title: "Session logged", body: input.sharedSummary.slice(0, 120), link: "/student/sessions" });
      await notify(db, await guardianUserIds(db, st.familyId), { type: "session", title: `Session summary for ${st.preferredName ?? st.firstName}`, body: input.sharedSummary.slice(0, 120), link: "/parent/sessions" });
    }
  }
  for (const id of input.nextStepsDone ?? []) await db.update(s.nextSteps).set({ status: "done", doneAt: new Date() }).where(eq(s.nextSteps.id, id));
  for (const qh of input.quickHomework ?? []) {
    if (!allowed.has(qh.studentId) || !qh.title.trim()) continue;
    await assignHomework(db, user, { studentId: qh.studentId, sessionId: sess.id, title: qh.title, type: "worksheet", instructions: qh.instructions, dueAt: zonedToUtc(addDaysKey(todayKey(), qh.dueInDays), "20:00"), priority: "normal", topicIds: qh.topicIds });
  }
  await audit(db, user, "session.log", "session", sess.id, { status: input.status });
}

export async function setSessionStatus(db: DB, user: CurrentUser, sessionId: string, status: s.SessionStatus, opts: { reason?: string; override?: boolean | null } = {}) {
  assertTutor(user);
  const sess = await db.query.sessions.findFirst({ where: eq(s.sessions.id, sessionId) });
  if (!sess || sess.tutorId !== user.tutorId) throw new Forbidden();
  const patch: Partial<typeof s.sessions.$inferInsert> = { status };
  if (status === "cancelled_by_family" || status === "cancelled_by_tutor") patch.cancelledAt = new Date();
  if (opts.override !== undefined) {
    patch.countsAgainstPackage = opts.override;
    patch.packageOverrideReason = opts.reason ?? null;
  }
  if (status === "scheduled") {
    patch.cancelledAt = null;
    patch.loggedAt = null;
  }
  await db.update(s.sessions).set(patch).where(eq(s.sessions.id, sessionId));
  await audit(db, user, "session.status", "session", sessionId, { status, ...opts });
}

export async function rescheduleSession(db: DB, user: CurrentUser, sessionId: string, dateKey: string, time: string) {
  assertTutor(user);
  const sess = await db.query.sessions.findFirst({ where: eq(s.sessions.id, sessionId), with: { sessionStudents: true } });
  if (!sess || sess.tutorId !== user.tutorId) throw new Forbidden();
  const newId_ = newId();
  await db.insert(s.sessions).values({
    id: newId_, tutorId: sess.tutorId, scheduleId: sess.scheduleId, startsAt: zonedToUtc(dateKey, time), durationMinutes: sess.durationMinutes, status: "scheduled",
    mode: sess.mode, location: sess.location, meetingLink: sess.meetingLink, packageId: sess.packageId,
  });
  for (const ss of sess.sessionStudents) await db.insert(s.sessionStudents).values({ sessionId: newId_, studentId: ss.studentId });
  await db.update(s.sessions).set({ status: "rescheduled", rescheduledToId: newId_ }).where(eq(s.sessions.id, sessionId));
  for (const ss of sess.sessionStudents) {
    const st = await db.query.students.findFirst({ where: eq(s.students.id, ss.studentId) });
    if (!st) continue;
    const when = `${formatDayShort(zonedToUtc(dateKey, time))} ${formatTime(zonedToUtc(dateKey, time))}`;
    await notify(db, [st.userId, ...(await guardianUserIds(db, st.familyId))], { type: "session", title: `Session moved to ${when}`, link: "/student/sessions" });
  }
  await audit(db, user, "session.reschedule", "session", sessionId, { to: newId_ });
  return newId_;
}

export async function createSession(db: DB, user: CurrentUser, input: { studentIds: string[]; dateKey: string; time: string; minutes: number; mode: "in_person" | "online"; location?: string; meetingLink?: string }) {
  assertTutor(user);
  for (const id of input.studentIds) await assertStudentAccess(db, user, id);
  const id = newId();
  const first = await db.query.students.findFirst({ where: eq(s.students.id, input.studentIds[0]) });
  const pkg = first ? await activePackageFor(db, first.id, first.familyId) : null;
  await db.insert(s.sessions).values({ id, tutorId: user.tutorId, startsAt: zonedToUtc(input.dateKey, input.time), durationMinutes: input.minutes, status: "scheduled", mode: input.mode, location: input.location ?? null, meetingLink: input.meetingLink ?? null, packageId: pkg?.id ?? null });
  for (const sid of input.studentIds) await db.insert(s.sessionStudents).values({ sessionId: id, studentId: sid });
  return id;
}

async function activePackageFor(db: DB, studentId: string, familyId: string) {
  return (
    (await db.query.packages.findFirst({ where: and(eq(s.packages.studentId, studentId), eq(s.packages.active, true)) })) ??
    (await db.query.packages.findFirst({ where: and(eq(s.packages.familyId, familyId), isNull(s.packages.studentId), eq(s.packages.active, true)) }))
  );
}

/** Materialise recurring sessions for the next `weeks`, skipping blackout dates and existing sessions. */
export async function generateUpcomingSessions(db: DB, tutorId: string, weeks = 6) {
  const schedules = await db.query.schedules.findMany({ where: and(eq(s.schedules.tutorId, tutorId), eq(s.schedules.active, true)), with: { student: true } });
  const blackouts = await db.query.blackoutDates.findMany({ where: eq(s.blackoutDates.tutorId, tutorId) });
  const today = todayKey();
  let created = 0;
  for (const sc of schedules) {
    const existing = await db.query.sessions.findMany({ where: eq(s.sessions.scheduleId, sc.id), columns: { startsAt: true } });
    const have = new Set(existing.map((e) => e.startsAt.getTime()));
    const pkg = await activePackageFor(db, sc.studentId, sc.student.familyId);
    for (let d = 0; d < weeks * 7; d++) {
      const key = addDaysKey(today, d);
      if (weekdayOf(key) !== sc.weekday || isInBlackout(key, blackouts)) continue;
      const startsAt = zonedToUtc(key, sc.startTime);
      if (have.has(startsAt.getTime()) || startsAt.getTime() < Date.now()) continue;
      const id = newId();
      await db.insert(s.sessions).values({ id, tutorId, scheduleId: sc.id, startsAt, durationMinutes: sc.durationMinutes, mode: sc.mode, location: sc.location, meetingLink: sc.meetingLink, packageId: pkg?.id ?? null });
      await db.insert(s.sessionStudents).values({ sessionId: id, studentId: sc.studentId });
      created++;
    }
  }
  return created;
}

// ---------------------------------------------------------------------------
// Homework & submissions
// ---------------------------------------------------------------------------

export async function assignHomework(db: DB, user: CurrentUser, input: { studentId: string; sessionId?: string; title: string; type: string; instructions?: string; dueAt: Date; priority: "low" | "normal" | "high"; estimatedMinutes?: number; submissionRequirement?: "photos" | "typed" | "none"; topicIds: string[]; links?: { label: string; url: string }[] }) {
  assertTutor(user);
  await assertStudentAccess(db, user, input.studentId);
  const id = newId();
  await db.insert(s.homework).values({
    id, tutorId: user.tutorId, studentId: input.studentId, sessionId: input.sessionId ?? null, title: input.title.trim(), type: input.type || "worksheet", instructions: input.instructions?.trim() || null,
    dueAt: input.dueAt, priority: input.priority, estimatedMinutes: input.estimatedMinutes ?? null, submissionRequirement: input.submissionRequirement ?? "photos",
  });
  for (const tid of input.topicIds) await db.insert(s.homeworkTopics).values({ homeworkId: id, enrolmentTopicId: tid });
  for (const l of input.links ?? []) if (l.url) await db.insert(s.attachments).values({ id: newId(), ownerType: "homework", ownerId: id, url: l.url, label: l.label || l.url });
  const st = await db.query.students.findFirst({ where: eq(s.students.id, input.studentId) });
  await notify(db, [st?.userId], { type: "homework", title: `New homework: ${input.title}`, body: `Due ${formatDayShort(input.dueAt)}`, link: `/student/homework/${id}` });
  await audit(db, user, "homework.assign", "homework", id);
  return id;
}

export async function submitHomework(db: DB, user: CurrentUser, homeworkId: string, fileIds: string[], comment?: string) {
  const h = await db.query.homework.findFirst({ where: eq(s.homework.id, homeworkId), with: { student: true } });
  if (!h) throw new Forbidden();
  if (user.role !== "student" || user.studentId !== h.studentId) throw new Forbidden("Only the student can submit");
  if (!["assigned", "in_progress", "corrections_requested"].includes(h.status)) throw new Error("This homework is not open for submission");
  if (!fileIds.length && h.submissionRequirement !== "none") throw new Error("Add at least one page");
  if (fileIds.length > MAX_PAGES) throw new Error(`Maximum ${MAX_PAGES} pages`);
  if (new Set(fileIds).size !== fileIds.length) throw new Error("Duplicate pages");
  const files = fileIds.length ? await db.query.files.findMany({ where: inArray(s.files.id, fileIds) }) : [];
  if (files.length !== fileIds.length || files.some((f) => f.uploadedByUserId !== user.id || f.tutorId !== user.tutorId)) throw new Forbidden("File does not belong to user");
  const prev = await db.query.submissions.findMany({ where: eq(s.submissions.homeworkId, homeworkId) });
  const id = newId();
  const version = prev.length + 1;
  await db.insert(s.submissions).values({ id, homeworkId, studentId: h.studentId, version, comment: comment?.trim() || null });
  for (const [i, fid] of fileIds.entries()) await db.insert(s.submissionPages).values({ id: newId(), submissionId: id, fileId: fid, pageOrder: i });
  const status: s.HomeworkStatus = h.status === "corrections_requested" ? "resubmitted" : "submitted";
  await db.update(s.homework).set({ status }).where(eq(s.homework.id, homeworkId));
  const name = h.student.preferredName ?? h.student.firstName;
  await notify(db, [await tutorUserId(db, h.tutorId)], { type: "submission", title: `${name} ${version > 1 ? "resubmitted" : "submitted"} ${h.title}`, body: `${fileIds.length} page${fileIds.length === 1 ? "" : "s"}${comment ? ` · "${comment.slice(0, 60)}"` : ""}`, link: `/tutor/homework/${homeworkId}` });
  await notify(db, await guardianUserIds(db, h.student.familyId), { type: "submission", title: `${name} submitted ${h.title}`, link: "/parent/homework" });
  return id;
}

export async function markInProgress(db: DB, user: CurrentUser, homeworkId: string) {
  const h = await db.query.homework.findFirst({ where: eq(s.homework.id, homeworkId) });
  if (!h || user.studentId !== h.studentId) throw new Forbidden();
  if (h.status === "assigned") await db.update(s.homework).set({ status: "in_progress" }).where(eq(s.homework.id, homeworkId));
}

export async function reviewSubmission(db: DB, user: CurrentUser, input: { homeworkId: string; submissionId: string; action: "approve" | "corrections"; feedback: string; feedbackVisibility: s.Visibility; score?: string; pageComments: { submissionPageId: string; body: string }[]; mastery: { enrolmentTopicId: string; level: s.Mastery }[] }) {
  assertTutor(user);
  const h = await db.query.homework.findFirst({ where: eq(s.homework.id, input.homeworkId), with: { student: true } });
  if (!h || h.tutorId !== user.tutorId) throw new Forbidden();
  const sub = await db.query.submissions.findFirst({ where: eq(s.submissions.id, input.submissionId) });
  if (!sub || sub.homeworkId !== h.id) throw new Forbidden();
  const outcome = input.action === "approve" ? "approved" : "corrections_requested";
  await db.update(s.submissions).set({ outcome, reviewedAt: new Date() }).where(eq(s.submissions.id, sub.id));
  await db
    .update(s.homework)
    .set({ status: input.action === "approve" ? "completed" : "corrections_requested", score: input.score?.trim() || h.score, completedAt: input.action === "approve" ? new Date() : null })
    .where(eq(s.homework.id, h.id));
  if (input.feedback.trim())
    await db.insert(s.feedback).values({ id: newId(), tutorId: user.tutorId, studentId: h.studentId, targetType: "submission", targetId: sub.id, authorUserId: user.id, body: input.feedback.trim(), visibility: input.feedbackVisibility });
  for (const pc of input.pageComments)
    if (pc.body.trim()) await db.insert(s.feedback).values({ id: newId(), tutorId: user.tutorId, studentId: h.studentId, targetType: "submission", targetId: sub.id, submissionPageId: pc.submissionPageId, authorUserId: user.id, body: pc.body.trim(), visibility: "student" });
  for (const m of input.mastery) await setMastery(db, user, h.studentId, m.enrolmentTopicId, m.level, "homework", h.id);
  if (input.action === "corrections") {
    await db.insert(s.nextSteps).values({ id: newId(), studentId: h.studentId, text: `Check corrections: ${h.title}`, source: "homework", sourceId: h.id });
  }
  const name = h.student.preferredName ?? h.student.firstName;
  await notify(db, [h.student.userId], {
    type: input.action === "approve" ? "review" : "corrections",
    title: input.action === "approve" ? `Reviewed: ${h.title}${input.score ? ` · ${input.score}` : ""}` : `Corrections requested: ${h.title}`,
    body: input.feedback.slice(0, 120),
    link: `/student/homework/${h.id}`,
  });
  if (input.action === "approve") await notify(db, await guardianUserIds(db, h.student.familyId), { type: "homework", title: `${name} completed ${h.title}${input.score ? ` (${input.score})` : ""}`, link: "/parent/homework" });
  await audit(db, user, `homework.${input.action}`, "homework", h.id);
}

// ---------------------------------------------------------------------------
// Assessments, revision, results
// ---------------------------------------------------------------------------

export async function createAssessment(db: DB, user: CurrentUser, input: { studentId: string; name: string; date: string; subjectId?: string; notes?: string; priority: "low" | "normal" | "high"; topicIds: string[] }) {
  assertTutor(user);
  await assertStudentAccess(db, user, input.studentId);
  const id = newId();
  await db.insert(s.assessments).values({ id, tutorId: user.tutorId, studentId: input.studentId, name: input.name.trim(), date: input.date, subjectId: input.subjectId ?? null, notes: input.notes?.trim() || null, priority: input.priority });
  for (const tid of input.topicIds) await db.insert(s.assessmentTopics).values({ assessmentId: id, enrolmentTopicId: tid });
  await db.insert(s.nextSteps).values({ id: newId(), studentId: input.studentId, text: `Begin revision for ${input.name}`, source: "assessment", sourceId: id });
  const st = await db.query.students.findFirst({ where: eq(s.students.id, input.studentId) });
  await notify(db, [st?.userId], { type: "test", title: `Test added: ${input.name}`, body: `Revision plan is ready`, link: "/student/tests" });
  return id;
}

export async function setRevisionStatus(db: DB, user: CurrentUser, assessmentId: string, enrolmentTopicId: string, status: s.RevisionStatus | null) {
  assertTutor(user);
  const a = await db.query.assessments.findFirst({ where: eq(s.assessments.id, assessmentId) });
  if (!a || a.tutorId !== user.tutorId) throw new Forbidden();
  await db.update(s.assessmentTopics).set({ revisionStatus: status }).where(and(eq(s.assessmentTopics.assessmentId, assessmentId), eq(s.assessmentTopics.enrolmentTopicId, enrolmentTopicId)));
}

export async function recordResult(db: DB, user: CurrentUser, input: { assessmentId: string; result: string; reflection?: string; sharedComment?: string; wentWrongTopicIds: string[] }) {
  assertTutor(user);
  const a = await db.query.assessments.findFirst({ where: eq(s.assessments.id, input.assessmentId), with: { topics: true, student: true } });
  if (!a || a.tutorId !== user.tutorId) throw new Forbidden();
  await db
    .insert(s.assessmentResults)
    .values({ id: newId(), assessmentId: a.id, result: input.result.trim(), reflection: input.reflection?.trim() || null, sharedComment: input.sharedComment?.trim() || null })
    .onConflictDoUpdate({ target: s.assessmentResults.assessmentId, set: { result: input.result.trim(), reflection: input.reflection?.trim() || null, sharedComment: input.sharedComment?.trim() || null, recordedAt: new Date() } });
  for (const tp of a.topics) {
    const wrong = input.wentWrongTopicIds.includes(tp.enrolmentTopicId);
    await db.update(s.assessmentTopics).set({ wentWrong: wrong }).where(and(eq(s.assessmentTopics.assessmentId, a.id), eq(s.assessmentTopics.enrolmentTopicId, tp.enrolmentTopicId)));
    if (wrong) await setMastery(db, user, a.studentId, tp.enrolmentTopicId, "needs_work", "assessment", a.id, `Went wrong in ${a.name}`);
  }
  if (input.wentWrongTopicIds.length) await db.insert(s.nextSteps).values({ id: newId(), studentId: a.studentId, text: `Correct ${a.name} mistakes (${input.wentWrongTopicIds.length} topics)`, source: "assessment", sourceId: a.id });
  const name = a.student.preferredName ?? a.student.firstName;
  await notify(db, await guardianUserIds(db, a.student.familyId), { type: "result", title: `${name}'s ${a.name} result recorded: ${input.result}`, link: "/parent/tests" });
  await notify(db, [a.student.userId], { type: "result", title: `${a.name}: ${input.result}`, body: input.sharedComment?.slice(0, 120), link: "/student/tests" });
}

// ---------------------------------------------------------------------------
// Next steps & feedback
// ---------------------------------------------------------------------------

export async function addNextStep(db: DB, user: CurrentUser, studentId: string, text: string) {
  assertTutor(user);
  await assertStudentAccess(db, user, studentId);
  if (!text.trim()) return;
  await db.insert(s.nextSteps).values({ id: newId(), studentId, text: text.trim(), source: "manual" });
}
export async function completeNextStep(db: DB, user: CurrentUser, id: string) {
  assertTutor(user);
  const n = await db.query.nextSteps.findFirst({ where: eq(s.nextSteps.id, id) });
  if (!n) return;
  await assertStudentAccess(db, user, n.studentId);
  await db.update(s.nextSteps).set({ status: "done", doneAt: new Date() }).where(eq(s.nextSteps.id, id));
}

export async function addFeedback(db: DB, user: CurrentUser, input: { studentId: string; body: string; visibility: s.Visibility; important?: boolean; targetType?: "general" | "session" | "homework" | "assessment"; targetId?: string }) {
  assertTutor(user);
  await assertStudentAccess(db, user, input.studentId);
  if (!input.body.trim()) return;
  await db.insert(s.feedback).values({ id: newId(), tutorId: user.tutorId, studentId: input.studentId, targetType: input.targetType ?? "general", targetId: input.targetId ?? null, authorUserId: user.id, body: input.body.trim(), visibility: input.visibility, important: !!input.important });
  const st = await db.query.students.findFirst({ where: eq(s.students.id, input.studentId) });
  if (!st) return;
  const name = st.preferredName ?? st.firstName;
  if (input.visibility === "family" || input.visibility === "parent") await notify(db, await guardianUserIds(db, st.familyId), { type: "feedback", title: `New feedback about ${name}`, body: input.body.slice(0, 120), link: "/parent/feedback" });
  if (input.visibility === "family" || input.visibility === "student") await notify(db, [st.userId], { type: "feedback", title: "A note from your tutor", body: input.body.slice(0, 120), link: "/student" });
}

// ---------------------------------------------------------------------------
// Invitations, activation, accounts
// ---------------------------------------------------------------------------

export async function createInvitation(db: DB, user: CurrentUser, target: { role: "student"; studentId: string } | { role: "guardian"; guardianId: string }, days = 14) {
  assertTutor(user);
  const tutor = (await db.query.tutors.findFirst({ where: eq(s.tutors.id, user.tutorId) }))!;
  let name = "user";
  if (target.role === "student") {
    const st = await db.query.students.findFirst({ where: eq(s.students.id, target.studentId) });
    if (!st || st.tutorId !== user.tutorId) throw new Forbidden();
    name = st.firstName;
    await db.update(s.invitations).set({ revokedAt: new Date() }).where(and(eq(s.invitations.studentId, st.id), isNull(s.invitations.usedAt), isNull(s.invitations.revokedAt)));
  } else {
    const g = await db.query.guardians.findFirst({ where: eq(s.guardians.id, target.guardianId) });
    if (!g || g.tutorId !== user.tutorId) throw new Forbidden();
    name = g.fullName.split(" ")[0];
    await db.update(s.invitations).set({ revokedAt: new Date() }).where(and(eq(s.invitations.guardianId, g.id), isNull(s.invitations.usedAt), isNull(s.invitations.revokedAt)));
  }
  const code = invitationCode(tutor.invitePrefix, name);
  await db.insert(s.invitations).values({ id: newId(), tutorId: user.tutorId, code, role: target.role, studentId: target.role === "student" ? target.studentId : null, guardianId: target.role === "guardian" ? target.guardianId : null, expiresAt: new Date(Date.now() + days * 86400000) });
  await audit(db, user, "invitation.create", "invitation", code);
  return code;
}

export async function revokeInvitation(db: DB, user: CurrentUser, id: string) {
  assertTutor(user);
  await db.update(s.invitations).set({ revokedAt: new Date() }).where(and(eq(s.invitations.id, id), eq(s.invitations.tutorId, user.tutorId)));
}

export type InvitationCheck = { ok: true; role: "guardian" | "student"; name: string; needsGuardianFirst: boolean; invitationId: string } | { ok: false };

export async function checkInvitation(db: DB, code: string): Promise<InvitationCheck> {
  const inv = await db.query.invitations.findFirst({ where: eq(s.invitations.code, code.trim().toUpperCase()), with: { student: true, guardian: true } });
  if (!inv || inv.usedAt || inv.revokedAt || inv.expiresAt.getTime() < Date.now()) return { ok: false };
  if (inv.role === "student" && inv.student) {
    // A guardian must have activated before a minor's account can be.
    const links = await db.query.familyGuardians.findMany({ where: eq(s.familyGuardians.familyId, inv.student.familyId), with: { guardian: true } });
    const guardianActive = links.some((l) => l.guardian.userId);
    return { ok: true, role: "student", name: inv.student.preferredName ?? inv.student.firstName, needsGuardianFirst: !guardianActive, invitationId: inv.id };
  }
  if (inv.role === "guardian" && inv.guardian) return { ok: true, role: "guardian", name: inv.guardian.fullName.split(" ")[0], needsGuardianFirst: false, invitationId: inv.id };
  return { ok: false };
}

export async function activateInvitation(db: DB, code: string, creds: { email?: string; username?: string; password: string }) {
  const check = await checkInvitation(db, code);
  if (!check.ok) throw new Error("invalid");
  if (check.needsGuardianFirst) throw new Error("guardianFirst");
  const inv = (await db.query.invitations.findFirst({ where: eq(s.invitations.id, check.invitationId), with: { student: true, guardian: true } }))!;
  const email = creds.email?.trim().toLowerCase() || null;
  const username = creds.username?.trim().toLowerCase() || null;
  if (check.role === "guardian" && !email) throw new Error("emailRequired");
  if (check.role === "student" && !username && !email) throw new Error("identifierRequired");
  if (email && (await db.query.users.findFirst({ where: eq(s.users.email, email) }))) throw new Error("taken");
  if (username && (await db.query.users.findFirst({ where: eq(s.users.username, username) }))) throw new Error("taken");
  const userId = newId();
  const displayName = check.role === "student" ? inv.student!.preferredName ?? inv.student!.firstName : inv.guardian!.fullName.split(" ")[0];
  await db.insert(s.users).values({ id: userId, tutorId: inv.tutorId, role: check.role, email, username, passwordHash: await bcrypt.hash(creds.password, 10), displayName });
  if (check.role === "student") await db.update(s.students).set({ userId }).where(eq(s.students.id, inv.studentId!));
  else await db.update(s.guardians).set({ userId, email: email ?? inv.guardian!.email }).where(eq(s.guardians.id, inv.guardianId!));
  await db.update(s.invitations).set({ usedAt: new Date(), usedByUserId: userId }).where(eq(s.invitations.id, inv.id));
  await notify(db, [await tutorUserId(db, inv.tutorId)], { type: "activation", title: `${displayName} activated their account`, link: "/tutor/invitations" });
  return userId;
}

export async function setUserStatus(db: DB, user: CurrentUser, userId: string, status: "active" | "deactivated") {
  assertTutor(user);
  const target = await db.query.users.findFirst({ where: eq(s.users.id, userId) });
  if (!target || target.tutorId !== user.tutorId || target.role === "tutor") throw new Forbidden();
  await db.update(s.users).set({ status }).where(eq(s.users.id, userId));
  if (status === "deactivated") await db.delete(s.authSessions).where(eq(s.authSessions.userId, userId));
}

export async function resetPassword(db: DB, user: CurrentUser, userId: string, newPassword: string) {
  const target = await db.query.users.findFirst({ where: eq(s.users.id, userId) });
  if (!target || target.tutorId !== user.tutorId) throw new Forbidden();
  if (user.role === "guardian") {
    // Guardians may only reset their own children's student passwords.
    const st = await db.query.students.findFirst({ where: eq(s.students.userId, userId) });
    if (!st || !user.familyIds.includes(st.familyId)) throw new Forbidden();
  } else if (user.role !== "tutor") throw new Forbidden();
  if (newPassword.length < 8) throw new Error("short");
  await db.update(s.users).set({ passwordHash: await bcrypt.hash(newPassword, 10) }).where(eq(s.users.id, userId));
  await db.delete(s.authSessions).where(eq(s.authSessions.userId, userId));
}

// ---------------------------------------------------------------------------
// Onboarding: create student → family/guardian → enrolment → schedule → invites
// ---------------------------------------------------------------------------

export async function createStudent(db: DB, user: CurrentUser, input: {
  firstName: string; lastName: string; preferredName?: string; school?: string; gradeYear?: string;
  familyId?: string; familyName?: string; guardianName?: string; guardianEmail?: string; guardianPhone?: string;
  templateId?: string; weekday?: number; time?: string; minutes?: number; mode?: "in_person" | "online"; packageSessions?: number;
}) {
  assertTutor(user);
  let familyId = input.familyId;
  let guardianId: string | null = null;
  if (!familyId) {
    familyId = newId();
    await db.insert(s.families).values({ id: familyId, tutorId: user.tutorId, name: input.familyName?.trim() || `${input.lastName.trim()} family` });
    if (input.guardianName?.trim()) {
      guardianId = newId();
      await db.insert(s.guardians).values({ id: guardianId, tutorId: user.tutorId, fullName: input.guardianName.trim(), email: input.guardianEmail?.trim() || null, phone: input.guardianPhone?.trim() || null });
      await db.insert(s.familyGuardians).values({ familyId, guardianId });
    }
  }
  const studentId = newId();
  await db.insert(s.students).values({ id: studentId, tutorId: user.tutorId, familyId, firstName: input.firstName.trim(), lastName: input.lastName.trim(), preferredName: input.preferredName?.trim() || null, school: input.school?.trim() || null, gradeYear: input.gradeYear?.trim() || null, startDate: todayKey(), avatarHue: Math.floor(Math.random() * 360) });
  if (input.templateId) await enrolStudent(db, user, studentId, input.templateId);
  if (input.time && input.weekday !== undefined) {
    await db.insert(s.schedules).values({ id: newId(), tutorId: user.tutorId, studentId, weekday: input.weekday, startTime: input.time, durationMinutes: input.minutes ?? 60, mode: input.mode ?? "in_person", location: input.mode === "online" ? null : "Student's home" });
  }
  if (input.packageSessions) await db.insert(s.packages).values({ id: newId(), tutorId: user.tutorId, familyId, studentId, totalSessions: input.packageSessions, startedAt: todayKey() });
  await generateUpcomingSessions(db, user.tutorId);
  const codes: { role: string; code: string }[] = [];
  if (guardianId) codes.push({ role: "guardian", code: await createInvitation(db, user, { role: "guardian", guardianId }) });
  codes.push({ role: "student", code: await createInvitation(db, user, { role: "student", studentId }) });
  await audit(db, user, "student.create", "student", studentId);
  return { studentId, codes };
}

export async function enrolStudent(db: DB, user: CurrentUser, studentId: string, templateId: string) {
  assertTutor(user);
  await assertStudentAccess(db, user, studentId);
  const tpl = await db.query.curriculumTemplates.findFirst({ where: eq(s.curriculumTemplates.id, templateId), with: { sections: { with: { topics: true } } } });
  if (!tpl || tpl.tutorId !== user.tutorId) throw new Forbidden();
  const enrolmentId = newId();
  await db.insert(s.enrolments).values({ id: enrolmentId, studentId, templateId, startedAt: todayKey() });
  let order = 0;
  for (const sec of [...tpl.sections].sort((a, b) => a.sortOrder - b.sortOrder))
    for (const tp of [...sec.topics].sort((a, b) => a.sortOrder - b.sortOrder))
      await db.insert(s.enrolmentTopics).values({ id: newId(), enrolmentId, topicId: tp.id, sectionId: sec.id, sortOrder: order++, isCurrent: order === 1 });
  return enrolmentId;
}

/** Bulk topic entry: one topic per line; "## Section name" starts a section; "code | name" or just "name". */
export async function importCurriculum(db: DB, user: CurrentUser, input: { name: string; subjectId: string; board?: string; level?: string; text: string }) {
  assertTutor(user);
  const id = newId();
  await db.insert(s.curriculumTemplates).values({ id, tutorId: user.tutorId, subjectId: input.subjectId, name: input.name.trim(), board: input.board?.trim() || null, level: input.level?.trim() || null, isDraft: false });
  let sectionId: string | null = null;
  let si = 0,
    ti = 0;
  for (const raw of input.text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      sectionId = newId();
      await db.insert(s.curriculumSections).values({ id: sectionId, templateId: id, name: line.replace(/^#+\s*/, ""), sortOrder: si++ });
      continue;
    }
    if (!sectionId) {
      sectionId = newId();
      await db.insert(s.curriculumSections).values({ id: sectionId, templateId: id, name: "Topics", sortOrder: si++ });
    }
    const [a, b] = line.split(/\s*[|,\t]\s*/);
    const code = b ? a : null;
    const name = b ? b : a;
    await db.insert(s.curriculumTopics).values({ id: newId(), sectionId, code, name, sortOrder: ti++ });
  }
  return id;
}

export async function addBlackout(db: DB, user: CurrentUser, startDate: string, endDate: string, reason: string) {
  assertTutor(user);
  await db.insert(s.blackoutDates).values({ id: newId(), tutorId: user.tutorId, startDate, endDate: endDate || startDate, reason: reason.trim() || "Break" });
  // Cancel scheduled sessions that now fall inside the blackout (tutor-cancelled, never counted).
  const scheduled = await db.query.sessions.findMany({ where: and(eq(s.sessions.tutorId, user.tutorId), eq(s.sessions.status, "scheduled")) });
  for (const sess of scheduled) {
    const key = sess.startsAt.toISOString().slice(0, 10);
    if (isInBlackout(key, [{ startDate, endDate: endDate || startDate }])) await db.update(s.sessions).set({ status: "cancelled_by_tutor", cancelledAt: new Date() }).where(eq(s.sessions.id, sess.id));
  }
}
export async function removeBlackout(db: DB, user: CurrentUser, id: string) {
  assertTutor(user);
  await db.delete(s.blackoutDates).where(and(eq(s.blackoutDates.id, id), eq(s.blackoutDates.tutorId, user.tutorId)));
}

export async function markNotificationsRead(db: DB, userId: string) {
  await db.update(s.notifications).set({ readAt: new Date() }).where(and(eq(s.notifications.userId, userId), isNull(s.notifications.readAt)));
}

/** Per-student data export (privacy requests). Only the tutor or the family may export. */
export async function exportStudent(db: DB, user: CurrentUser, studentId: string) {
  await assertStudentAccess(db, user, studentId);
  const student = await db.query.students.findFirst({ where: eq(s.students.id, studentId), with: { enrolments: { with: { topics: { with: { topic: true } } } }, schedules: true } });
  const mastery = await db.query.topicMastery.findMany({ where: eq(s.topicMastery.studentId, studentId) });
  const history = await db.query.topicMasteryHistory.findMany({ where: eq(s.topicMasteryHistory.studentId, studentId) });
  const ss = await db.query.sessionStudents.findMany({ where: eq(s.sessionStudents.studentId, studentId), with: { session: { with: { topics: true } } } });
  const hw = await db.query.homework.findMany({ where: eq(s.homework.studentId, studentId), with: { submissions: { with: { pages: true } }, topics: true } });
  const tests = await db.query.assessments.findMany({ where: eq(s.assessments.studentId, studentId), with: { topics: true, result: true } });
  const steps = await db.query.nextSteps.findMany({ where: eq(s.nextSteps.studentId, studentId) });
  const fb = await db.query.feedback.findMany({ where: eq(s.feedback.studentId, studentId) });
  const visible = user.role === "tutor" ? fb : fb.filter((f) => f.visibility !== "private");
  return { exportedAt: new Date().toISOString(), student, mastery, masteryHistory: history, sessions: ss.map((x) => x.session), homework: hw, assessments: tests, nextSteps: steps, feedback: visible };
}
