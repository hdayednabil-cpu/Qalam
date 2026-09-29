# Qalam security and storage review — 2026-09-29

## Applied to the active Supabase project

Migration `0001_server_only_database.sql` was applied through the Supabase
management connection as `postgres`. All 39 public application tables now have
RLS enabled and no table privileges for PUBLIC, anon, or authenticated. The
owner retains server access. Default table grants for the migration owner were
removed. The migration is idempotent so the normal Drizzle migration runner can
record it on its next run.

Verification: 39/39 tables protected; 0 readable by browser roles. User, student,
and file counts were unchanged. Supabase's 39 RLS-disabled errors are gone.
The remaining [RLS Enabled No Policy informational notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
are intentional: this app uses its own server sessions, not Supabase Auth.
Do not add anonymous browser policies just to remove these notices.

## Prepared application changes (not yet deployed)

- Use the private Supabase bucket for durable uploads and downloads. Local
  storage is development-only, and incomplete production configuration fails
  closed. Storage keys and secrets stay server-side.
- Require homework ownership and tutor scope for uploads; reject guardian
  uploads, closed homework, oversized files and invalid PDF headers.
- Limit uploads to 4 MiB and submissions to 20 distinct files; reject missing
  file references and files owned by someone else. Limit decoded image pixels.
- Clean up the stored object if saving the database record fails.
- Require a production file-signing secret, reject expired/tampered links,
  disable download caching, and add nosniff.
- Update Drizzle ORM to 0.45.3 and sharp to 0.35.5 for security fixes.

## Release gates

1. Replace exposed credentials through account dashboards. Coordinate the
   database password change with Vercel's DATABASE_URL update. Create a new
   Supabase secret, update SUPABASE_SERVICE_ROLE_KEY, verify, then revoke the old
   secret. Change AUTH_SECRET and reset the existing tutor password. Bootstrap
   TUTOR_INITIAL_PASSWORD does not reset an existing database user. Invalidate
   existing sessions as part of credential recovery. Do not put any values in
   source control, issue descriptions, or chat.
2. Verify Vercel has DATABASE_URL, AUTH_SECRET, SUPABASE_URL,
   SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET=qalam-uploads and
   DEMO_LOGINS=false. Keep the bucket private. Preview environments should use
   isolated test data rather than live student data.
3. Verify signed-in tutor/student/guardian access after the live database change.
   Preview-test upload, refresh/download, forbidden access and a full homework
   submission. Merge only after this and the credential replacement are done.
4. Production smoke test after deployment; retain the previous deployment for
   rollback. Do not undo database protections to roll back the application.

## Verification completed

- Production build passed, including TypeScript checks.
- 24 automated tests passed, covering existing access and homework flows,
  database browser-role denial and preserved owner access, file signatures,
  storage configuration, Supabase SDK HTTP calls (mocked network), upload
  authorization, oversized input, and storage/database failure paths.
- No real cloud upload was performed. Live signed-in flows still require a
  secure browser sign-in by the owner.

## Follow-up before broader use

- npm audit still reports 8 dependency findings: 1 high (PostCSS under Next.js)
  and 7 moderate (including framework and development tools). The proposed
  automatic fixes include major upgrades and a Drizzle tooling downgrade;
  those need a separate compatibility review. This is not a clean security audit.
- Login throttling is currently per-process, so it is not a durable rate limit
  across Vercel instances. Move it to shared storage or an edge protection rule.
- Tutor "view as" queries need explicit tutor scoping before multi-tutor use.
- The live curriculum catalogue is empty. Reports/resources and other unfinished
  features need product review before adding OpenAI integration.
- This is a focused review, not a complete penetration test or incident analysis.
