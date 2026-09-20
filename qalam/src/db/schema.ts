import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Conventions
// - Every tenant-owned table carries tutor_id so multi-tutor tenancy is a
//   policy change later, not a migration.
// - Statuses are text columns constrained by TypeScript unions (see below) so
//   adding a state is a code change rather than an enum migration.
// - All timestamps are stored in UTC and rendered in Asia/Qatar.
// ---------------------------------------------------------------------------

export const ROLES = ["tutor", "guardian", "student"] as const;
export type Role = (typeof ROLES)[number];

export const MASTERY = ["not_started", "needs_work", "developing", "comfortable", "strong"] as const;
export type Mastery = (typeof MASTERY)[number];

export const SESSION_STATUS = [
  "scheduled",
  "completed",
  "cancelled_by_family",
  "cancelled_by_tutor",
  "no_show",
  "rescheduled",
] as const;
export type SessionStatus = (typeof SESSION_STATUS)[number];

export const HOMEWORK_STATUS = [
  "assigned",
  "in_progress",
  "submitted",
  "reviewed",
  "corrections_requested",
  "resubmitted",
  "completed",
] as const; // "overdue" is derived at query time from due_at
export type HomeworkStatus = (typeof HOMEWORK_STATUS)[number];

export const VISIBILITY = ["private", "student", "parent", "family"] as const;
export type Visibility = (typeof VISIBILITY)[number];

export const REVISION_STATUS = ["not_started", "in_progress", "needs_work", "revised"] as const;
export type RevisionStatus = (typeof REVISION_STATUS)[number];

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").defaultNow().notNull();

// --- Tenancy & identity -----------------------------------------------------

export const tutors = pgTable("tutors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").default("Asia/Qatar").notNull(),
  weekStartsOn: integer("week_starts_on").default(0).notNull(), // 0 = Sunday
  workingHoursStart: text("working_hours_start").default("14:00").notNull(),
  workingHoursEnd: text("working_hours_end").default("22:00").notNull(),
  lateCancellationHours: integer("late_cancellation_hours").default(24).notNull(),
  defaultSessionMinutes: integer("default_session_minutes").default(60).notNull(),
  invitePrefix: text("invite_prefix").default("NAB").notNull(),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id").notNull().references(() => tutors.id),
    role: text("role").$type<Role>().notNull(),
    email: text("email"),
    username: text("username"),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    status: text("status").$type<"active" | "deactivated">().default("active").notNull(),
    lastLoginAt: ts("last_login_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_username_idx").on(t.username)],
);

export const authSessions = pgTable("auth_sessions", {
  id: text("id").primaryKey(), // random token, stored hashed in cookie flow
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  createdAt: createdAt(),
});

export const families = pgTable("families", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  name: text("name").notNull(),
  accessStatus: text("access_status").$type<"active" | "paused" | "ended">().default("active").notNull(),
  validUntil: date("valid_until", { mode: "string" }),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const guardians = pgTable("guardians", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"), // E.164, e.g. +97455512345 — used for WhatsApp links
  relationship: text("relationship"), // father, mother, guardian...
  createdAt: createdAt(),
});

// A guardian may belong to more than one family (unusual, but not blocked).
export const familyGuardians = pgTable(
  "family_guardians",
  {
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    guardianId: text("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.familyId, t.guardianId] })],
);

export const students = pgTable(
  "students",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id").notNull().references(() => tutors.id),
    familyId: text("family_id").notNull().references(() => families.id),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    preferredName: text("preferred_name"),
    school: text("school"),
    gradeYear: text("grade_year"), // "Grade 8", "Year 12", "IB DP1"
    avatarHue: integer("avatar_hue").default(210).notNull(),
    startDate: date("start_date", { mode: "string" }),
    status: text("status").$type<"active" | "paused" | "ended" | "prospective">().default("active").notNull(),
    academicNotes: text("academic_notes"), // tutor-private
    importantNote: text("important_note"), // shown to the student on their dashboard
    createdAt: createdAt(),
  },
  (t) => [index("students_family_idx").on(t.familyId)],
);

// --- Curriculum -------------------------------------------------------------

export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  name: text("name").notNull(),
  colour: text("colour").default("teal").notNull(),
});

export const curriculumTemplates = pgTable("curriculum_templates", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  name: text("name").notNull(), // "Pearson Edexcel IGCSE Mathematics A (4MA1)"
  board: text("board"),
  level: text("level"),
  isDraft: boolean("is_draft").default(false).notNull(), // "verify against the official specification"
  createdAt: createdAt(),
});

export const curriculumSections = pgTable("curriculum_sections", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => curriculumTemplates.id, { onDelete: "cascade" }),
  code: text("code"),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const curriculumTopics = pgTable(
  "curriculum_topics",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id").notNull().references(() => curriculumSections.id, { onDelete: "cascade" }),
    parentTopicId: text("parent_topic_id"), // optional subtopic nesting
    code: text("code"),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [index("curriculum_topics_section_idx").on(t.sectionId)],
);

export const enrolments = pgTable("enrolments", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => curriculumTemplates.id),
  label: text("label"), // optional override, e.g. "IB Maths AI SL"
  status: text("status").$type<"active" | "completed" | "paused">().default("active").notNull(),
  startedAt: date("started_at", { mode: "string" }),
  createdAt: createdAt(),
});

// Per-student instance of the template. Topics can be excluded, reordered or
// supplemented (custom_name set, topic_id null) without touching the template.
export const enrolmentTopics = pgTable(
  "enrolment_topics",
  {
    id: text("id").primaryKey(),
    enrolmentId: text("enrolment_id").notNull().references(() => enrolments.id, { onDelete: "cascade" }),
    topicId: text("topic_id").references(() => curriculumTopics.id),
    sectionId: text("section_id").references(() => curriculumSections.id),
    customName: text("custom_name"),
    inScope: boolean("in_scope").default(true).notNull(),
    sortOrder: integer("sort_order").notNull(),
    isCurrent: boolean("is_current").default(false).notNull(), // "current topic" marker
  },
  (t) => [index("enrolment_topics_enrolment_idx").on(t.enrolmentId)],
);

export const topicMastery = pgTable(
  "topic_mastery",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    enrolmentTopicId: text("enrolment_topic_id").notNull().references(() => enrolmentTopics.id, { onDelete: "cascade" }),
    level: text("level").$type<Mastery>().notNull(),
    source: text("source").$type<"session" | "homework" | "assessment" | "manual">().notNull(),
    sourceId: text("source_id"),
    updatedAt: ts("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("topic_mastery_unique").on(t.studentId, t.enrolmentTopicId)],
);

export const topicMasteryHistory = pgTable("topic_mastery_history", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  enrolmentTopicId: text("enrolment_topic_id").notNull().references(() => enrolmentTopics.id, { onDelete: "cascade" }),
  level: text("level").$type<Mastery>().notNull(),
  source: text("source").notNull(),
  sourceId: text("source_id"),
  note: text("note"),
  recordedAt: ts("recorded_at").defaultNow().notNull(),
});

// --- Scheduling & sessions --------------------------------------------------

export const schedules = pgTable("schedules", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(), // 0 = Sunday ... 6 = Saturday
  startTime: text("start_time").notNull(), // "16:30" local (Asia/Qatar)
  durationMinutes: integer("duration_minutes").notNull(),
  mode: text("mode").$type<"in_person" | "online">().default("in_person").notNull(),
  location: text("location"),
  meetingLink: text("meeting_link"),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
});

export const blackoutDates = pgTable("blackout_dates", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  reason: text("reason").notNull(),
});

export const packages = pgTable("packages", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  studentId: text("student_id").references(() => students.id, { onDelete: "cascade" }), // null = shared by the family
  totalSessions: integer("total_sessions").notNull(),
  startedAt: date("started_at", { mode: "string" }).notNull(),
  paymentStatus: text("payment_status").$type<"unpaid" | "paid" | "partial" | "waived">().default("unpaid").notNull(),
  amountQar: integer("amount_qar"),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id").notNull().references(() => tutors.id),
    scheduleId: text("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
    startsAt: ts("starts_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: text("status").$type<SessionStatus>().default("scheduled").notNull(),
    mode: text("mode").$type<"in_person" | "online">().default("in_person").notNull(),
    location: text("location"),
    meetingLink: text("meeting_link"),
    packageId: text("package_id").references(() => packages.id, { onDelete: "set null" }),
    // null = follow the rules; true/false = tutor override (reason required)
    countsAgainstPackage: boolean("counts_against_package"),
    packageOverrideReason: text("package_override_reason"),
    cancelledAt: ts("cancelled_at"),
    rescheduledToId: text("rescheduled_to_id"),
    sharedSummary: text("shared_summary"), // visible to family
    privateNotes: text("private_notes"), // tutor only
    planForNext: text("plan_for_next"),
    loggedAt: ts("logged_at"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_starts_idx").on(t.startsAt)],
);

export const sessionStudents = pgTable(
  "session_students",
  {
    sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    attended: boolean("attended"),
    assessment: text("assessment"), // per-student tutor assessment (private)
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.studentId] })],
);

export const sessionTopics = pgTable("session_topics", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  enrolmentTopicId: text("enrolment_topic_id").notNull().references(() => enrolmentTopics.id, { onDelete: "cascade" }),
  masteryLevel: text("mastery_level").$type<Mastery>(),
  note: text("note"),
});

export const nextSteps = pgTable("next_steps", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  source: text("source").$type<"manual" | "session" | "homework" | "assessment" | "rule">().default("manual").notNull(),
  sourceId: text("source_id"),
  status: text("status").$type<"open" | "done">().default("open").notNull(),
  createdAt: createdAt(),
  doneAt: ts("done_at"),
});

// --- Files & homework -------------------------------------------------------

export const files = pgTable("files", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  storageKey: text("storage_key").notNull(), // relative key in UPLOAD_DIR / bucket
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  originalName: text("original_name"),
  width: integer("width"),
  height: integer("height"),
  uploadedByUserId: text("uploaded_by_user_id").references(() => users.id),
  createdAt: createdAt(),
});

export const homework = pgTable(
  "homework",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id").notNull().references(() => tutors.id),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    sessionId: text("session_id").references(() => sessions.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    type: text("type").default("worksheet").notNull(), // free text: worksheet, past paper, corrections...
    instructions: text("instructions"),
    assignedAt: ts("assigned_at").defaultNow().notNull(),
    dueAt: ts("due_at").notNull(),
    priority: text("priority").$type<"low" | "normal" | "high">().default("normal").notNull(),
    estimatedMinutes: integer("estimated_minutes"),
    submissionRequirement: text("submission_requirement").$type<"photos" | "typed" | "none">().default("photos").notNull(),
    status: text("status").$type<HomeworkStatus>().default("assigned").notNull(),
    score: text("score"), // free-form: "7/10", "B", "Excellent"
    completedAt: ts("completed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("homework_student_idx").on(t.studentId)],
);

export const homeworkTopics = pgTable(
  "homework_topics",
  {
    homeworkId: text("homework_id").notNull().references(() => homework.id, { onDelete: "cascade" }),
    enrolmentTopicId: text("enrolment_topic_id").notNull().references(() => enrolmentTopics.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.homeworkId, t.enrolmentTopicId] })],
);

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  ownerType: text("owner_type").$type<"homework" | "session" | "resource" | "assessment">().notNull(),
  ownerId: text("owner_id").notNull(),
  fileId: text("file_id").references(() => files.id, { onDelete: "cascade" }),
  url: text("url"),
  label: text("label").notNull(),
});

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  homeworkId: text("homework_id").notNull().references(() => homework.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  version: integer("version").default(1).notNull(),
  comment: text("comment"),
  submittedAt: ts("submitted_at").defaultNow().notNull(),
  reviewedAt: ts("reviewed_at"),
  outcome: text("outcome").$type<"pending" | "approved" | "corrections_requested">().default("pending").notNull(),
});

export const submissionPages = pgTable("submission_pages", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  fileId: text("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  pageOrder: integer("page_order").notNull(),
});

// Comments / feedback on anything, always with an explicit visibility.
export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    tutorId: text("tutor_id").notNull().references(() => tutors.id),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    targetType: text("target_type").$type<"submission" | "session" | "homework" | "assessment" | "general">().notNull(),
    targetId: text("target_id"),
    submissionPageId: text("submission_page_id").references(() => submissionPages.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    visibility: text("visibility").$type<Visibility>().default("private").notNull(),
    important: boolean("important").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("feedback_student_idx").on(t.studentId)],
);

// --- Assessments (school tests) & revision ----------------------------------

export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  subjectId: text("subject_id").references(() => subjects.id),
  name: text("name").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  notes: text("notes"),
  priority: text("priority").$type<"low" | "normal" | "high">().default("normal").notNull(),
  createdAt: createdAt(),
});

export const assessmentTopics = pgTable(
  "assessment_topics",
  {
    assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    enrolmentTopicId: text("enrolment_topic_id").notNull().references(() => enrolmentTopics.id, { onDelete: "cascade" }),
    // Explicit revision status set by the tutor; null = derive from mastery + sessions.
    revisionStatus: text("revision_status").$type<RevisionStatus>(),
    wentWrong: boolean("went_wrong").default(false).notNull(), // set when the result is recorded
  },
  (t) => [primaryKey({ columns: [t.assessmentId, t.enrolmentTopicId] })],
);

export const assessmentResults = pgTable("assessment_results", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().unique().references(() => assessments.id, { onDelete: "cascade" }),
  result: text("result").notNull(), // free-form: "68%", "Level 6", "B+"
  reflection: text("reflection"),
  sharedComment: text("shared_comment"),
  recordedAt: ts("recorded_at").defaultNow().notNull(),
});

// --- Resources, reports, invitations, notifications ------------------------

export const resources = pgTable("resources", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  studentId: text("student_id").references(() => students.id, { onDelete: "cascade" }), // null = shared library
  subjectId: text("subject_id").references(() => subjects.id),
  assessmentId: text("assessment_id").references(() => assessments.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  type: text("type").notNull(), // lesson summary, formula sheet, worksheet, mock test, answer key, link...
  url: text("url"),
  fileId: text("file_id").references(() => files.id, { onDelete: "set null" }),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  createdAt: createdAt(),
});

export const resourceTopics = pgTable(
  "resource_topics",
  {
    resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
    enrolmentTopicId: text("enrolment_topic_id").notNull().references(() => enrolmentTopics.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.resourceId, t.enrolmentTopicId] })],
);

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  periodStart: date("period_start", { mode: "string" }).notNull(),
  periodEnd: date("period_end", { mode: "string" }).notNull(),
  status: text("status").$type<"draft" | "published">().default("draft").notNull(),
  // Generated figures (sessions, topics, homework...) snapshot + editable text sections.
  data: jsonb("data").$type<Record<string, unknown>>().default({}).notNull(),
  tutorComments: text("tutor_comments"),
  publishedAt: ts("published_at"),
  createdAt: createdAt(),
});

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  code: text("code").notNull().unique(), // e.g. NAB-DANIEL-7X4KQ2
  role: text("role").$type<"guardian" | "student">().notNull(),
  studentId: text("student_id").references(() => students.id, { onDelete: "cascade" }),
  guardianId: text("guardian_id").references(() => guardians.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  usedByUserId: text("used_by_user_id"),
  revokedAt: ts("revoked_at"),
  createdAt: createdAt(),
});

export const invitationAttempts = pgTable("invitation_attempts", {
  id: text("id").primaryKey(),
  ipHash: text("ip_hash").notNull(),
  attemptedAt: ts("attempted_at").defaultNow().notNull(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  tutorId: text("tutor_id").notNull().references(() => tutors.id),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

// --- Relations (used by the relational query API) -------------------------

export const studentsRelations = relations(students, ({ one, many }) => ({
  family: one(families, { fields: [students.familyId], references: [families.id] }),
  user: one(users, { fields: [students.userId], references: [users.id] }),
  enrolments: many(enrolments),
  schedules: many(schedules),
}));

export const familiesRelations = relations(families, ({ many }) => ({
  students: many(students),
  familyGuardians: many(familyGuardians),
  packages: many(packages),
}));

export const familyGuardiansRelations = relations(familyGuardians, ({ one }) => ({
  family: one(families, { fields: [familyGuardians.familyId], references: [families.id] }),
  guardian: one(guardians, { fields: [familyGuardians.guardianId], references: [guardians.id] }),
}));

export const guardiansRelations = relations(guardians, ({ one, many }) => ({
  user: one(users, { fields: [guardians.userId], references: [users.id] }),
  familyGuardians: many(familyGuardians),
}));

export const enrolmentsRelations = relations(enrolments, ({ one, many }) => ({
  student: one(students, { fields: [enrolments.studentId], references: [students.id] }),
  template: one(curriculumTemplates, { fields: [enrolments.templateId], references: [curriculumTemplates.id] }),
  topics: many(enrolmentTopics),
}));

export const curriculumTemplatesRelations = relations(curriculumTemplates, ({ one, many }) => ({
  subject: one(subjects, { fields: [curriculumTemplates.subjectId], references: [subjects.id] }),
  sections: many(curriculumSections),
}));

export const curriculumSectionsRelations = relations(curriculumSections, ({ one, many }) => ({
  template: one(curriculumTemplates, { fields: [curriculumSections.templateId], references: [curriculumTemplates.id] }),
  topics: many(curriculumTopics),
}));

export const curriculumTopicsRelations = relations(curriculumTopics, ({ one }) => ({
  section: one(curriculumSections, { fields: [curriculumTopics.sectionId], references: [curriculumSections.id] }),
}));

export const enrolmentTopicsRelations = relations(enrolmentTopics, ({ one }) => ({
  enrolment: one(enrolments, { fields: [enrolmentTopics.enrolmentId], references: [enrolments.id] }),
  topic: one(curriculumTopics, { fields: [enrolmentTopics.topicId], references: [curriculumTopics.id] }),
  section: one(curriculumSections, { fields: [enrolmentTopics.sectionId], references: [curriculumSections.id] }),
}));

export const sessionsRelations = relations(sessions, ({ many }) => ({
  sessionStudents: many(sessionStudents),
  topics: many(sessionTopics),
}));

export const sessionStudentsRelations = relations(sessionStudents, ({ one }) => ({
  session: one(sessions, { fields: [sessionStudents.sessionId], references: [sessions.id] }),
  student: one(students, { fields: [sessionStudents.studentId], references: [students.id] }),
}));

export const sessionTopicsRelations = relations(sessionTopics, ({ one }) => ({
  session: one(sessions, { fields: [sessionTopics.sessionId], references: [sessions.id] }),
  enrolmentTopic: one(enrolmentTopics, { fields: [sessionTopics.enrolmentTopicId], references: [enrolmentTopics.id] }),
}));

export const homeworkRelations = relations(homework, ({ one, many }) => ({
  student: one(students, { fields: [homework.studentId], references: [students.id] }),
  topics: many(homeworkTopics),
  submissions: many(submissions),
}));

export const homeworkTopicsRelations = relations(homeworkTopics, ({ one }) => ({
  homework: one(homework, { fields: [homeworkTopics.homeworkId], references: [homework.id] }),
  enrolmentTopic: one(enrolmentTopics, { fields: [homeworkTopics.enrolmentTopicId], references: [enrolmentTopics.id] }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  homework: one(homework, { fields: [submissions.homeworkId], references: [homework.id] }),
  pages: many(submissionPages),
}));

export const submissionPagesRelations = relations(submissionPages, ({ one }) => ({
  submission: one(submissions, { fields: [submissionPages.submissionId], references: [submissions.id] }),
  file: one(files, { fields: [submissionPages.fileId], references: [files.id] }),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  student: one(students, { fields: [assessments.studentId], references: [students.id] }),
  topics: many(assessmentTopics),
  result: one(assessmentResults, { fields: [assessments.id], references: [assessmentResults.assessmentId] }),
}));

export const assessmentTopicsRelations = relations(assessmentTopics, ({ one }) => ({
  assessment: one(assessments, { fields: [assessmentTopics.assessmentId], references: [assessments.id] }),
  enrolmentTopic: one(enrolmentTopics, { fields: [assessmentTopics.enrolmentTopicId], references: [enrolmentTopics.id] }),
}));

export const topicMasteryRelations = relations(topicMastery, ({ one }) => ({
  enrolmentTopic: one(enrolmentTopics, { fields: [topicMastery.enrolmentTopicId], references: [enrolmentTopics.id] }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  student: one(students, { fields: [schedules.studentId], references: [students.id] }),
}));

export const packagesRelations = relations(packages, ({ one }) => ({
  family: one(families, { fields: [packages.familyId], references: [families.id] }),
  student: one(students, { fields: [packages.studentId], references: [students.id] }),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  student: one(students, { fields: [resources.studentId], references: [students.id] }),
  subject: one(subjects, { fields: [resources.subjectId], references: [subjects.id] }),
  topics: many(resourceTopics),
}));

export const resourceTopicsRelations = relations(resourceTopics, ({ one }) => ({
  resource: one(resources, { fields: [resourceTopics.resourceId], references: [resources.id] }),
  enrolmentTopic: one(enrolmentTopics, { fields: [resourceTopics.enrolmentTopicId], references: [enrolmentTopics.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  student: one(students, { fields: [invitations.studentId], references: [students.id] }),
  guardian: one(guardians, { fields: [invitations.guardianId], references: [guardians.id] }),
}));

export const nextStepsRelations = relations(nextSteps, ({ one }) => ({
  student: one(students, { fields: [nextSteps.studentId], references: [students.id] }),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  author: one(users, { fields: [feedback.authorUserId], references: [users.id] }),
}));
