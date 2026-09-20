CREATE TABLE "assessment_results" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"result" text NOT NULL,
	"reflection" text,
	"shared_comment" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_results_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE "assessment_topics" (
	"assessment_id" text NOT NULL,
	"enrolment_topic_id" text NOT NULL,
	"revision_status" text,
	"went_wrong" boolean DEFAULT false NOT NULL,
	CONSTRAINT "assessment_topics_assessment_id_enrolment_topic_id_pk" PRIMARY KEY("assessment_id","enrolment_topic_id")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" text NOT NULL,
	"file_id" text,
	"url" text,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blackout_dates" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"name" text NOT NULL,
	"board" text,
	"level" text,
	"is_draft" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"parent_topic_id" text,
	"code" text,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrolment_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"enrolment_id" text NOT NULL,
	"topic_id" text,
	"section_id" text,
	"custom_name" text,
	"in_scope" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrolments" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"template_id" text NOT NULL,
	"label" text,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"name" text NOT NULL,
	"access_status" text DEFAULT 'active' NOT NULL,
	"valid_until" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_guardians" (
	"family_id" text NOT NULL,
	"guardian_id" text NOT NULL,
	CONSTRAINT "family_guardians_family_id_guardian_id_pk" PRIMARY KEY("family_id","guardian_id")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"submission_page_id" text,
	"author_user_id" text NOT NULL,
	"body" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"important" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"original_name" text,
	"width" integer,
	"height" integer,
	"uploaded_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"user_id" text,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"relationship" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"session_id" text,
	"title" text NOT NULL,
	"type" text DEFAULT 'worksheet' NOT NULL,
	"instructions" text,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"estimated_minutes" integer,
	"submission_requirement" text DEFAULT 'photos' NOT NULL,
	"status" text DEFAULT 'assigned' NOT NULL,
	"score" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_topics" (
	"homework_id" text NOT NULL,
	"enrolment_topic_id" text NOT NULL,
	CONSTRAINT "homework_topics_homework_id_enrolment_topic_id_pk" PRIMARY KEY("homework_id","enrolment_topic_id")
);
--> statement-breakpoint
CREATE TABLE "invitation_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"code" text NOT NULL,
	"role" text NOT NULL,
	"student_id" text,
	"guardian_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_user_id" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "next_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"text" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"family_id" text NOT NULL,
	"student_id" text,
	"total_sessions" integer NOT NULL,
	"started_at" date NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"amount_qar" integer,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tutor_comments" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_topics" (
	"resource_id" text NOT NULL,
	"enrolment_topic_id" text NOT NULL,
	CONSTRAINT "resource_topics_resource_id_enrolment_topic_id_pk" PRIMARY KEY("resource_id","enrolment_topic_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"student_id" text,
	"subject_id" text,
	"assessment_id" text,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"url" text,
	"file_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"student_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"mode" text DEFAULT 'in_person' NOT NULL,
	"location" text,
	"meeting_link" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_students" (
	"session_id" text NOT NULL,
	"student_id" text NOT NULL,
	"attended" boolean,
	"assessment" text,
	CONSTRAINT "session_students_session_id_student_id_pk" PRIMARY KEY("session_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "session_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"student_id" text NOT NULL,
	"enrolment_topic_id" text NOT NULL,
	"mastery_level" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"schedule_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"mode" text DEFAULT 'in_person' NOT NULL,
	"location" text,
	"meeting_link" text,
	"package_id" text,
	"counts_against_package" boolean,
	"package_override_reason" text,
	"cancelled_at" timestamp with time zone,
	"rescheduled_to_id" text,
	"shared_summary" text,
	"private_notes" text,
	"plan_for_next" text,
	"logged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"family_id" text NOT NULL,
	"user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_name" text,
	"school" text,
	"grade_year" text,
	"avatar_hue" integer DEFAULT 210 NOT NULL,
	"start_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"academic_notes" text,
	"important_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"name" text NOT NULL,
	"colour" text DEFAULT 'teal' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"file_id" text NOT NULL,
	"page_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"homework_id" text NOT NULL,
	"student_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"comment" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"outcome" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_mastery" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"enrolment_topic_id" text NOT NULL,
	"level" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_mastery_history" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"enrolment_topic_id" text NOT NULL,
	"level" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Qatar' NOT NULL,
	"week_starts_on" integer DEFAULT 0 NOT NULL,
	"working_hours_start" text DEFAULT '14:00' NOT NULL,
	"working_hours_end" text DEFAULT '22:00' NOT NULL,
	"late_cancellation_hours" integer DEFAULT 24 NOT NULL,
	"default_session_minutes" integer DEFAULT 60 NOT NULL,
	"invite_prefix" text DEFAULT 'NAB' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"tutor_id" text NOT NULL,
	"role" text NOT NULL,
	"email" text,
	"username" text,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_topics" ADD CONSTRAINT "assessment_topics_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_topics" ADD CONSTRAINT "assessment_topics_enrolment_topic_id_enrolment_topics_id_fk" FOREIGN KEY ("enrolment_topic_id") REFERENCES "public"."enrolment_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blackout_dates" ADD CONSTRAINT "blackout_dates_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_sections" ADD CONSTRAINT "curriculum_sections_template_id_curriculum_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."curriculum_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_templates" ADD CONSTRAINT "curriculum_templates_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_templates" ADD CONSTRAINT "curriculum_templates_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_topics" ADD CONSTRAINT "curriculum_topics_section_id_curriculum_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."curriculum_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_topics" ADD CONSTRAINT "enrolment_topics_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_topics" ADD CONSTRAINT "enrolment_topics_topic_id_curriculum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment_topics" ADD CONSTRAINT "enrolment_topics_section_id_curriculum_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."curriculum_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_template_id_curriculum_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."curriculum_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_guardians" ADD CONSTRAINT "family_guardians_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_guardians" ADD CONSTRAINT "family_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_submission_page_id_submission_pages_id_fk" FOREIGN KEY ("submission_page_id") REFERENCES "public"."submission_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_topics" ADD CONSTRAINT "homework_topics_homework_id_homework_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_topics" ADD CONSTRAINT "homework_topics_enrolment_topic_id_enrolment_topics_id_fk" FOREIGN KEY ("enrolment_topic_id") REFERENCES "public"."enrolment_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "next_steps" ADD CONSTRAINT "next_steps_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_topics" ADD CONSTRAINT "resource_topics_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_topics" ADD CONSTRAINT "resource_topics_enrolment_topic_id_enrolment_topics_id_fk" FOREIGN KEY ("enrolment_topic_id") REFERENCES "public"."enrolment_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_students" ADD CONSTRAINT "session_students_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_students" ADD CONSTRAINT "session_students_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_topics" ADD CONSTRAINT "session_topics_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_topics" ADD CONSTRAINT "session_topics_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_topics" ADD CONSTRAINT "session_topics_enrolment_topic_id_enrolment_topics_id_fk" FOREIGN KEY ("enrolment_topic_id") REFERENCES "public"."enrolment_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_pages" ADD CONSTRAINT "submission_pages_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_pages" ADD CONSTRAINT "submission_pages_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_homework_id_homework_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_enrolment_topic_id_enrolment_topics_id_fk" FOREIGN KEY ("enrolment_topic_id") REFERENCES "public"."enrolment_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery_history" ADD CONSTRAINT "topic_mastery_history_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_mastery_history" ADD CONSTRAINT "topic_mastery_history_enrolment_topic_id_enrolment_topics_id_fk" FOREIGN KEY ("enrolment_topic_id") REFERENCES "public"."enrolment_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tutor_id_tutors_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."tutors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "curriculum_topics_section_idx" ON "curriculum_topics" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "enrolment_topics_enrolment_idx" ON "enrolment_topics" USING btree ("enrolment_id");--> statement-breakpoint
CREATE INDEX "feedback_student_idx" ON "feedback" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "homework_student_idx" ON "homework" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_starts_idx" ON "sessions" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "students_family_idx" ON "students" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_mastery_unique" ON "topic_mastery" USING btree ("student_id","enrolment_topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");