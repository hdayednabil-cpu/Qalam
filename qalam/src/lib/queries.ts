import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, or, isNull } from "drizzle-orm";
import type { DB } from "@/db";
import * as s from "@/db/schema";
import type { CurrentUser } from "./auth";
import { accessibleStudentIds, assertStudentAccess, canAccessStudent, visibleTo } from "./access";
import { computeCoverage, deriveRevision, effectiveHomeworkStatus, packageUsage, revisionProgress, homeworkCompletionRate, type TopicView, type Coverage, MASTERY_ORDER } from "./domain";
import { addDaysKey, daysUntil, toDateKey, todayKey } from "./dates";
import { t } from "./i18n";

// ---------------------------------------------------------------------------
// Types returned to pages
// ---------------------------------------------------------------------------

export type EnrolmentView = {
  id: string;
  templateName: string;
  subject: string;
  subjectColour: string;
  label: string;
  topics: TopicView[];
  coverage: Coverage;
  currentTopic: TopicView | null;
};

export type SessionView = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  status: s.SessionStatus;
  mode: "in_person" | "online";
  location: string | null;
  meetingLink: string | null;
  sharedSummary: string | null;
  privateNotes: string | null;
  planForNext: string | null;
  loggedAt: Date | null;
  cancelledAt: Date | null;
  countsAgainstPackage: boolean | null;
  packageOverrideReason: string | null;
  needsLog: boolean; // time passed, still "scheduled"
  students: { id: string; name: string; attended: boolean | null; assessment: string | null }[];
  topics: { studentId: string; enrolmentTopicId: string; name: string; mastery: s.Mastery | null; note: string | null }[];
};

export type HomeworkView = {
  id: string;
  studentId: string;
  title: string;
  type: string;
  instructions: string | null;
  assignedAt: Date;
  dueAt: Date;
  priority: "low" | "normal" | "high";
  estimatedMinutes: number | null;
  submissionRequirement: "photos" | "typed" | "none";
  status: s.HomeworkStatus;
  effectiveStatus: string;
  score: string | null;
  completedAt: Date | null;
  topics: { id: string; name: string }[];
  latestSubmission: { id: string; version: number; submittedAt: Date; comment: string | null; outcome: string; pageCount: number } | null;
  submissionCount: number;
};

export type AssessmentView = {
  id: string;
  studentId: string;
  name: string;
  date: string;
  daysUntil: number;
  subject: string | null;
  notes: string | null;
  priority: "low" | "normal" | "high";
  topics: { enrolmentTopicId: string; name: string; mastery: s.Mastery | null; explicit: s.RevisionStatus | null; status: s.RevisionStatus; wentWrong: boolean }[];
  revision: { total: number; revised: number; unrevised: number; percent: number };
  result: { result: string; reflection: string | null; sharedComment: string | null; recordedAt: Date } | null;
};

export type FeedbackView = { id: string; body: string; visibility: s.Visibility; important: boolean; createdAt: Date; targetType: string; targetId: string | null; authorName: string; submissionPageId: string | null };

export type Alert = { kind: string; text: string; severity: "info" | "warn" | "danger"; link?: string };

export type Workspace = {
  student: typeof s.students.$inferSelect;
  displayName: string;
  family: typeof s.families.$inferSelect;
  guardians: (typeof s.guardians.$inferSelect)[];
  enrolments: EnrolmentView[];
  allTopics: TopicView[];
  sessions: SessionView[]; // newest first
  upcoming: SessionView[]; // soonest first
  nextSession: SessionView | null;
  lastLogged: SessionView | null;
  schedules: (typeof s.schedules.$inferSelect)[];
  pkg: { id: string; total: number; used: number; remaining: number; scheduled: number; low: boolean; shared: boolean; paymentStatus: string } | null;
  homework: HomeworkView[]; // newest first
  assessments: AssessmentView[]; // upcoming first, then past
  nextSteps: (typeof s.nextSteps.$inferSelect)[];
  feedback: FeedbackView[]; // visibility-filtered, newest first
  resources: (typeof s.resources.$inferSelect)[];
  alerts: Alert[];
  stats: { sessionsThisMonth: number; upcomingThisMonth: number; homeworkCompletion: number | null; attendance: number | null };
};

// ---------------------------------------------------------------------------

function topicName(et: { customName: string | null; topic: { name: string; code: string | null } | null }) {
  return et.customName ?? et.topic?.name ?? "Topic";
}

export function studentName(st: { firstName: string; preferredName?: string | null }) {
  return st.preferredName ?? st.firstName;
}

export async function getWorkspace(db: DB, user: CurrentUser, studentId: string): Promise<Workspace> {
  await assertStudentAccess(db, user, studentId);
  const student = await db.query.students.findFirst({ where: eq(s.students.id, studentId) });
  if (!student) throw new Error("Student not found");
  const family = (await db.query.families.findFirst({ where: eq(s.families.id, student.familyId) }))!;
  const links = await db.query.familyGuardians.findMany({ where: eq(s.familyGuardians.familyId, family.id), with: { guardian: true } });
  const guardians = links.map((l) => l.guardian);

  // Enrolments + per-topic mastery
  const enrolRows = await db.query.enrolments.findMany({
    where: eq(s.enrolments.studentId, studentId),
    with: { template: { with: { subject: true } }, topics: { with: { topic: true, section: true }, orderBy: [asc(s.enrolmentTopics.sortOrder)] } },
  });
  const masteryRows = await db.query.topicMastery.findMany({ where: eq(s.topicMastery.studentId, studentId) });
  const mastery = new Map(masteryRows.map((m) => [m.enrolmentTopicId, m.level]));
  const enrolments: EnrolmentView[] = enrolRows.map((e) => {
    const topics: TopicView[] = e.topics.map((et) => ({
      id: et.id,
      name: topicName(et),
      code: et.topic?.code ?? null,
      sectionName: et.section?.name ?? null,
      inScope: et.inScope,
      isCurrent: et.isCurrent,
      mastery: mastery.get(et.id) ?? null,
      sortOrder: et.sortOrder,
    }));
    return {
      id: e.id,
      templateName: e.template.name,
      subject: e.template.subject.name,
      subjectColour: e.template.subject.colour,
      label: e.label ?? e.template.name,
      topics,
      coverage: computeCoverage(topics),
      currentTopic: topics.find((x) => x.isCurrent) ?? null,
    };
  });
  const allTopics = enrolments.flatMap((e) => e.topics);
  const topicById = new Map(allTopics.map((x) => [x.id, x]));

  // Sessions
  const ssRows = await db.query.sessionStudents.findMany({ where: eq(s.sessionStudents.studentId, studentId), columns: { sessionId: true } });
  const sessionIds = ssRows.map((r) => r.sessionId);
  const sessions = sessionIds.length ? await loadSessions(db, sessionIds) : [];
  sessions.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const now = Date.now();
  const upcoming = sessions.filter((x) => x.status === "scheduled" && x.endsAt.getTime() >= now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const lastLogged = sessions.find((x) => x.status === "completed" && x.loggedAt) ?? null;

  const schedules = await db.query.schedules.findMany({ where: and(eq(s.schedules.studentId, studentId), eq(s.schedules.active, true)) });

  // Package (student-specific first, else family-shared)
  const pkgRow =
    (await db.query.packages.findFirst({ where: and(eq(s.packages.studentId, studentId), eq(s.packages.active, true)), orderBy: [desc(s.packages.startedAt)] })) ??
    (await db.query.packages.findFirst({ where: and(eq(s.packages.familyId, student.familyId), isNull(s.packages.studentId), eq(s.packages.active, true)), orderBy: [desc(s.packages.startedAt)] }));
  let pkg: Workspace["pkg"] = null;
  if (pkgRow) {
    const tutor = await db.query.tutors.findFirst({ where: eq(s.tutors.id, student.tutorId) });
    const pkgSessions = await db.query.sessions.findMany({ where: eq(s.sessions.packageId, pkgRow.id), columns: { status: true, startsAt: true, cancelledAt: true, countsAgainstPackage: true } });
    const u = packageUsage(pkgRow.totalSessions, pkgSessions, tutor?.lateCancellationHours ?? 24);
    pkg = { id: pkgRow.id, ...u, shared: !pkgRow.studentId, paymentStatus: pkgRow.paymentStatus };
  }

  // Homework
  const hwRows = await db.query.homework.findMany({
    where: eq(s.homework.studentId, studentId),
    with: { topics: true, submissions: { with: { pages: true }, orderBy: [desc(s.submissions.version)] } },
    orderBy: [desc(s.homework.assignedAt)],
  });
  const homework: HomeworkView[] = hwRows.map((h) => ({
    id: h.id,
    studentId: h.studentId,
    title: h.title,
    type: h.type,
    instructions: h.instructions,
    assignedAt: h.assignedAt,
    dueAt: h.dueAt,
    priority: h.priority,
    estimatedMinutes: h.estimatedMinutes,
    submissionRequirement: h.submissionRequirement,
    status: h.status,
    effectiveStatus: effectiveHomeworkStatus(h.status, h.dueAt),
    score: h.score,
    completedAt: h.completedAt,
    topics: h.topics.map((x) => ({ id: x.enrolmentTopicId, name: topicById.get(x.enrolmentTopicId)?.name ?? "Topic" })),
    latestSubmission: h.submissions[0]
      ? { id: h.submissions[0].id, version: h.submissions[0].version, submittedAt: h.submissions[0].submittedAt, comment: h.submissions[0].comment, outcome: h.submissions[0].outcome, pageCount: h.submissions[0].pages.length }
      : null,
    submissionCount: h.submissions.length,
  }));

  // Assessments
  const asRows = await db.query.assessments.findMany({ where: eq(s.assessments.studentId, studentId), with: { topics: true, result: true } });
  const subjects = await db.query.subjects.findMany({ where: eq(s.subjects.tutorId, student.tutorId) });
  const assessments: AssessmentView[] = asRows
    .map((a) => {
      const topics = a.topics.map((at) => {
        const tv = topicById.get(at.enrolmentTopicId);
        const m = tv?.mastery ?? null;
        return { enrolmentTopicId: at.enrolmentTopicId, name: tv?.name ?? "Topic", mastery: m, explicit: at.revisionStatus, status: deriveRevision(at.revisionStatus, m), wentWrong: at.wentWrong };
      });
      return {
        id: a.id,
        studentId: a.studentId,
        name: a.name,
        date: a.date,
        daysUntil: daysUntil(a.date),
        subject: subjects.find((x) => x.id === a.subjectId)?.name ?? null,
        notes: a.notes,
        priority: a.priority,
        topics,
        revision: revisionProgress(topics.map((x) => x.status)),
        result: a.result ? { result: a.result.result, reflection: a.result.reflection, sharedComment: a.result.sharedComment, recordedAt: a.result.recordedAt } : null,
      };
    })
    .sort((a, b) => (a.daysUntil >= 0 && b.daysUntil >= 0 ? a.daysUntil - b.daysUntil : b.daysUntil - a.daysUntil));

  const nextSteps = await db.query.nextSteps.findMany({ where: and(eq(s.nextSteps.studentId, studentId), eq(s.nextSteps.status, "open")), orderBy: [asc(s.nextSteps.createdAt)] });

  const fbRows = await db.query.feedback.findMany({
    where: and(eq(s.feedback.studentId, studentId), inArray(s.feedback.visibility, visibleTo(user.role))),
    with: { author: true },
    orderBy: [desc(s.feedback.createdAt)],
  });
  const feedback: FeedbackView[] = fbRows.map((f) => ({ id: f.id, body: f.body, visibility: f.visibility, important: f.important, createdAt: f.createdAt, targetType: f.targetType, targetId: f.targetId, authorName: f.author.displayName, submissionPageId: f.submissionPageId }));

  const resources = await db.query.resources.findMany({
    where: and(eq(s.resources.tutorId, student.tutorId), or(eq(s.resources.studentId, studentId), isNull(s.resources.studentId))),
    orderBy: [desc(s.resources.createdAt)],
  });

  // Stats
  const monthKey = todayKey().slice(0, 7);
  const sessionsThisMonth = sessions.filter((x) => x.status === "completed" && toDateKey(x.startsAt).startsWith(monthKey)).length;
  const upcomingThisMonth = upcoming.filter((x) => toDateKey(x.startsAt).startsWith(monthKey)).length;
  const attended = sessions.filter((x) => x.status === "completed").length;
  const missed = sessions.filter((x) => x.status === "no_show").length;
  const stats = {
    sessionsThisMonth,
    upcomingThisMonth,
    homeworkCompletion: homeworkCompletionRate(homework),
    attendance: attended + missed ? Math.round((attended / (attended + missed)) * 100) : null,
  };

  const ws: Workspace = {
    student,
    displayName: studentName(student),
    family,
    guardians,
    enrolments,
    allTopics,
    sessions,
    upcoming,
    nextSession: upcoming[0] ?? null,
    lastLogged,
    schedules,
    pkg,
    homework,
    assessments,
    nextSteps,
    feedback,
    resources,
    alerts: [],
    stats,
  };
  ws.alerts = computeAlerts(ws);
  return ws;
}

/** Rule-based, deterministic intelligence. Every alert is explainable. */
export function computeAlerts(ws: Workspace): Alert[] {
  const alerts: Alert[] = [];
  for (const a of ws.assessments) {
    if (a.daysUntil >= 0 && a.daysUntil <= 21 && a.revision.unrevised > 0)
      alerts.push({ kind: "test", severity: a.daysUntil <= 7 ? "danger" : "warn", text: t("intel.testSoon", { test: a.name, days: a.daysUntil, n: a.revision.unrevised }), link: `/tutor/tests/${a.id}` });
  }
  // Struggled: same topic marked needs_work in ≥2 of the last 3 logged sessions
  const lastThree = ws.sessions.filter((x) => x.status === "completed" && x.loggedAt).slice(0, 3);
  const counts = new Map<string, number>();
  for (const sess of lastThree) for (const tp of sess.topics) if (tp.mastery === "needs_work") counts.set(tp.name, (counts.get(tp.name) ?? 0) + 1);
  for (const [name, n] of counts) if (n >= 2) alerts.push({ kind: "struggle", severity: "warn", text: t("intel.struggled", { topic: name, n }) });
  const overdue = ws.homework.filter((h) => h.effectiveStatus === "overdue").length;
  if (overdue) alerts.push({ kind: "overdue", severity: "warn", text: t("intel.hwOverdue", { n: overdue }) });
  // Completion fell: this month vs previous month
  const mk = todayKey().slice(0, 7);
  const prevKey = addDaysKey(todayKey().slice(0, 7) + "-01", -1).slice(0, 7);
  const rate = (k: string) => homeworkCompletionRate(ws.homework.filter((h) => toDateKey(h.dueAt).startsWith(k)));
  const rThis = rate(mk),
    rPrev = rate(prevKey);
  if (rThis !== null && rPrev !== null && rThis < rPrev - 15) alerts.push({ kind: "hw", severity: "warn", text: t("intel.hwFell") });
  if (ws.pkg?.low) alerts.push({ kind: "package", severity: "info", text: t("intel.packageLow", { n: ws.pkg.remaining }) });
  const logged = ws.sessions.filter((x) => x.status === "completed").length;
  if (logged <= 1 && ws.allTopics.filter((x) => x.mastery).length < 4) alerts.push({ kind: "new", severity: "info", text: t("intel.newStudent") });
  const unlogged = ws.sessions.filter((x) => x.needsLog).length;
  if (unlogged) alerts.push({ kind: "unlogged", severity: "info", text: t("intel.unlogged", { n: unlogged }) });
  return alerts;
}

export async function loadSessions(db: DB, ids: string[]): Promise<SessionView[]> {
  if (!ids.length) return [];
  const rows = await db.query.sessions.findMany({
    where: inArray(s.sessions.id, ids),
    with: { sessionStudents: { with: { student: true } }, topics: { with: { enrolmentTopic: { with: { topic: true } } } } },
  });
  const now = Date.now();
  return rows.map((r) => {
    const endsAt = new Date(r.startsAt.getTime() + r.durationMinutes * 60000);
    return {
      id: r.id,
      startsAt: r.startsAt,
      endsAt,
      durationMinutes: r.durationMinutes,
      status: r.status,
      mode: r.mode,
      location: r.location,
      meetingLink: r.meetingLink,
      sharedSummary: r.sharedSummary,
      privateNotes: r.privateNotes,
      planForNext: r.planForNext,
      loggedAt: r.loggedAt,
      cancelledAt: r.cancelledAt,
      countsAgainstPackage: r.countsAgainstPackage,
      packageOverrideReason: r.packageOverrideReason,
      needsLog: r.status === "scheduled" && endsAt.getTime() < now,
      students: r.sessionStudents.map((ss) => ({ id: ss.studentId, name: studentName(ss.student), attended: ss.attended, assessment: ss.assessment })),
      topics: r.topics.map((tp) => ({ studentId: tp.studentId, enrolmentTopicId: tp.enrolmentTopicId, name: topicName(tp.enrolmentTopic), mastery: tp.masteryLevel, note: tp.note })),
    };
  });
}

/** Sessions in a date range (keys inclusive), scoped to the students the user may see. */
export async function sessionsBetween(db: DB, user: CurrentUser, fromKey: string, toKey: string) {
  const ids = await accessibleStudentIds(db, user);
  if (!ids.length) return [];
  const from = new Date(new Date(fromKey + "T00:00:00Z").getTime() - 4 * 3600000);
  const to = new Date(new Date(toKey + "T23:59:59Z").getTime() + 4 * 3600000);
  const ss = await db
    .select({ sessionId: s.sessionStudents.sessionId })
    .from(s.sessionStudents)
    .innerJoin(s.sessions, eq(s.sessions.id, s.sessionStudents.sessionId))
    .where(and(inArray(s.sessionStudents.studentId, ids), gte(s.sessions.startsAt, from), lte(s.sessions.startsAt, to)));
  const uniq = [...new Set(ss.map((x) => x.sessionId))];
  const rows = await loadSessions(db, uniq);
  return rows.filter((r) => toDateKey(r.startsAt) >= fromKey && toDateKey(r.startsAt) <= toKey).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function getSession(db: DB, user: CurrentUser, sessionId: string): Promise<SessionView | null> {
  const [row] = await loadSessions(db, [sessionId]);
  if (!row) return null;
  const ids = await accessibleStudentIds(db, user);
  if (!row.students.some((st) => ids.includes(st.id))) return null;
  return row;
}

// ---------------------------------------------------------------------------
// Tutor-wide views
// ---------------------------------------------------------------------------

export type StudentSummary = {
  id: string;
  name: string;
  fullName: string;
  gradeYear: string | null;
  school: string | null;
  status: string;
  hue: number;
  familyName: string;
  enrolments: string[];
  coverage: number;
  pkg: Workspace["pkg"];
  alerts: Alert[];
  nextSession: SessionView | null;
  currentTopic: string | null;
  startDate: string | null;
};

export async function listStudents(db: DB, user: CurrentUser): Promise<StudentSummary[]> {
  const ids = await accessibleStudentIds(db, user);
  const out: StudentSummary[] = [];
  for (const id of ids) {
    const ws = await getWorkspace(db, user, id);
    const totalCov = computeCoverage(ws.allTopics);
    out.push({
      id,
      name: ws.displayName,
      fullName: `${ws.student.firstName} ${ws.student.lastName}`,
      gradeYear: ws.student.gradeYear,
      school: ws.student.school,
      status: ws.student.status,
      hue: ws.student.avatarHue,
      familyName: ws.family.name,
      enrolments: ws.enrolments.map((e) => e.subject),
      coverage: totalCov.percent,
      pkg: ws.pkg,
      alerts: ws.alerts,
      nextSession: ws.nextSession,
      currentTopic: ws.enrolments.map((e) => e.currentTopic?.name).find(Boolean) ?? null,
      startDate: ws.student.startDate,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTutorDashboard(db: DB, user: CurrentUser) {
  const ids = await accessibleStudentIds(db, user);
  const workspaces = new Map<string, Workspace>();
  for (const id of ids) workspaces.set(id, await getWorkspace(db, user, id));
  const all = [...workspaces.values()];
  const today = todayKey();
  const todays = await sessionsBetween(db, user, today, today);
  const week = await sessionsBetween(db, user, addDaysKey(today, 1), addDaysKey(today, 7));
  const needsLog = all.flatMap((w) => w.sessions.filter((x) => x.needsLog)).filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const awaitingReview = all.flatMap((w) => w.homework.filter((h) => h.status === "submitted" || h.status === "resubmitted").map((h) => ({ ...h, studentName: w.displayName })));
  const overdue = all.flatMap((w) => w.homework.filter((h) => h.effectiveStatus === "overdue").map((h) => ({ ...h, studentName: w.displayName })));
  const upcomingTests = all
    .flatMap((w) => w.assessments.filter((a) => a.daysUntil >= 0 && !a.result).map((a) => ({ ...a, studentName: w.displayName })))
    .sort((a, b) => a.daysUntil - b.daysUntil);
  const attention = all
    .map((w) => ({ id: w.student.id, name: w.displayName, hue: w.student.avatarHue, alerts: w.alerts.filter((a) => a.severity !== "info" || a.kind === "package") }))
    .filter((x) => x.alerts.length)
    .sort((a, b) => b.alerts.length - a.alerts.length);
  const recentSubmissions = all
    .flatMap((w) => w.homework.filter((h) => h.latestSubmission).map((h) => ({ ...h, studentName: w.displayName })))
    .sort((a, b) => b.latestSubmission!.submittedAt.getTime() - a.latestSubmission!.submittedAt.getTime())
    .slice(0, 6);
  const nextActions = all.flatMap((w) => w.nextSteps.slice(0, 2).map((n) => ({ ...n, studentName: w.displayName })));
  const completedThisWeek = all.flatMap((w) => w.sessions).filter((x) => x.status === "completed" && toDateKey(x.startsAt) >= addDaysKey(today, -7)).length;
  const completionRates = all.map((w) => w.stats.homeworkCompletion).filter((x): x is number => x !== null);
  const indicators = {
    activeStudents: all.filter((w) => w.student.status === "active").length,
    sessionsThisWeek: completedThisWeek,
    homeworkCompletion: completionRates.length ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length) : null,
    lowPackages: all.filter((w) => w.pkg?.low).length,
  };
  return { todays, week, needsLog, awaitingReview, overdue, upcomingTests, attention, recentSubmissions, nextActions, indicators, workspaces };
}

export async function searchAll(db: DB, user: CurrentUser, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return { students: [], topics: [], homework: [], tests: [], resources: [] };
  const students = await listStudents(db, user);
  const out = { students: [] as StudentSummary[], topics: [] as { studentId: string; studentName: string; topic: TopicView }[], homework: [] as (HomeworkView & { studentName: string })[], tests: [] as (AssessmentView & { studentName: string })[], resources: [] as (typeof s.resources.$inferSelect)[] };
  for (const st of students) {
    if (st.fullName.toLowerCase().includes(needle) || st.familyName.toLowerCase().includes(needle)) out.students.push(st);
    const ws = await getWorkspace(db, user, st.id);
    for (const tp of ws.allTopics) if (tp.name.toLowerCase().includes(needle)) out.topics.push({ studentId: st.id, studentName: st.name, topic: tp });
    for (const h of ws.homework) if (h.title.toLowerCase().includes(needle)) out.homework.push({ ...h, studentName: st.name });
    for (const a of ws.assessments) if (a.name.toLowerCase().includes(needle)) out.tests.push({ ...a, studentName: st.name });
    for (const r of ws.resources) if (r.title.toLowerCase().includes(needle) && !out.resources.some((x) => x.id === r.id)) out.resources.push(r);
  }
  return out;
}

export function sortByMastery(topics: TopicView[]) {
  return [...topics].sort((a, b) => MASTERY_ORDER[a.mastery ?? "not_started"] - MASTERY_ORDER[b.mastery ?? "not_started"]);
}

/** Homework detail with submissions and page files, authorised. */
export async function getHomeworkDetail(db: DB, user: CurrentUser, homeworkId: string) {
  const h = await db.query.homework.findFirst({
    where: eq(s.homework.id, homeworkId),
    with: { topics: true, submissions: { with: { pages: { with: { file: true }, orderBy: [asc(s.submissionPages.pageOrder)] } }, orderBy: [desc(s.submissions.version)] }, student: true },
  });
  if (!h) return null;
  if (!(await canAccessStudent(db, user, h.studentId))) return null;
  const ws = await getWorkspace(db, user, h.studentId);
  const view = ws.homework.find((x) => x.id === homeworkId)!;
  const fb = ws.feedback.filter((f) => (f.targetType === "homework" && f.targetId === homeworkId) || (f.targetType === "submission" && h.submissions.some((sub) => sub.id === f.targetId)));
  return { homework: h, view, ws, feedback: fb };
}

export async function listInvitations(db: DB, user: CurrentUser) {
  return db.query.invitations.findMany({ where: eq(s.invitations.tutorId, user.tutorId), with: { student: true, guardian: true }, orderBy: [desc(s.invitations.createdAt)] });
}

export async function listAccounts(db: DB, user: CurrentUser) {
  return db.query.users.findMany({ where: eq(s.users.tutorId, user.tutorId), orderBy: [asc(s.users.role), asc(s.users.displayName)] });
}

export async function unreadNotifications(db: DB, userId: string) {
  return db.query.notifications.findMany({ where: and(eq(s.notifications.userId, userId), isNull(s.notifications.readAt)), orderBy: [desc(s.notifications.createdAt)], limit: 20 });
}

export async function listBlackouts(db: DB, tutorId: string) {
  return db.query.blackoutDates.findMany({ where: eq(s.blackoutDates.tutorId, tutorId), orderBy: [asc(s.blackoutDates.startDate)] });
}
