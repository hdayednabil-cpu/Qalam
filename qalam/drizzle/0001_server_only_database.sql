-- Qalam uses server-side session authorization and a direct PostgreSQL connection.
-- Browser roles must never access application tables through the Supabase Data API.
-- No auth.uid() policies are appropriate: Qalam does not use Supabase Auth.
-- Table owners retain access; FORCE ROW LEVEL SECURITY is deliberately not used.
DO $qalam_security$
DECLARE
  table_name text;
  client_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'assessment_results',
    'assessment_topics',
    'assessments',
    'attachments',
    'audit_log',
    'auth_sessions',
    'blackout_dates',
    'curriculum_sections',
    'curriculum_templates',
    'curriculum_topics',
    'enrolment_topics',
    'enrolments',
    'families',
    'family_guardians',
    'feedback',
    'files',
    'guardians',
    'homework',
    'homework_topics',
    'invitation_attempts',
    'invitations',
    'next_steps',
    'notifications',
    'packages',
    'reports',
    'resource_topics',
    'resources',
    'schedules',
    'session_students',
    'session_topics',
    'sessions',
    'students',
    'subjects',
    'submission_pages',
    'submissions',
    'topic_mastery',
    'topic_mastery_history',
    'tutors',
    'users'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, client_role);
      END IF;
    END LOOP;
  END LOOP;
  -- New tables created by the migration owner must also start private.
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', client_role);
    END IF;
  END LOOP;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
END
$qalam_security$;
