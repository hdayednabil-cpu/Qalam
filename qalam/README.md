# Qalam — private tutoring operating system

One calm place for a private tutoring practice: sessions, homework with photo
submissions, curriculum coverage and mastery, tests with revision plans, and a
parent view of it all. Built for a maths/science tutor in Doha (Asia/Qatar,
week starts Sunday, DD/MM/YYYY), with three portals: **tutor**, **student**,
**parent**.

## Run it locally (zero setup)

Requirements: Node.js 20 or newer. No Docker, no Postgres install.

```bash
npm install
npm run db:reset     # creates the embedded database, applies migrations, loads demo data
npm run dev          # http://localhost:3000
```

Demo logins are shown on the login page (password for every demo account is `demo1234`):

| Role    | Login                | What you'll see                                            |
| ------- | -------------------- | ---------------------------------------------------------- |
| Tutor   | `nabil@qalam.demo`   | 6 students, sessions to log, homework awaiting review      |
| Parent  | `ahmed@qalam.demo`   | Three children (Mohammed, Maryam, Muhanna) with a switcher |
| Student | `daniel`             | Homework, a Functions Test in 8 days, revision plan        |

Other seeded students: `chris`, `mohammed`, `maryam`, `muhanna` (same password).
Pending invitation codes to try the activation flow: `NAB-AARNAV-DEMO01` (student — a
guardian in that family has already activated, so it works immediately) and
`NAB-NOORA-DEMO02` (second guardian of the Al-Kuwari family).

All demo dates are generated relative to today, so dashboards always look live.
`npm run db:reset` wipes and regenerates everything.

## Scripts

| Script                | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `npm run dev`         | development server                                            |
| `npm run build`       | production build (type-checks everything)                     |
| `npm run start`       | production server                                             |
| `npm run db:reset`    | drop local DB + uploads, migrate, seed                         |
| `npm run db:migrate`  | apply migrations only (use this in production)                |
| `npm run db:seed`     | seed an empty, migrated database                              |
| `npm run db:generate` | generate a new SQL migration after editing `src/db/schema.ts` |
| `npm test`            | permission + domain-rule tests on an in-memory database        |

## Stack and why

| Choice                                  | Why                                                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js 15 (App Router) + TypeScript** | Server components + server actions keep every read and write on the server; one codebase for all three portals.                            |
| **Tailwind CSS 4**                       | Design tokens live in `src/app/globals.css` (`@theme`). Restrained, warm palette; one bottom nav on mobile, sidebar on desktop.            |
| **Drizzle ORM, Postgres dialect**        | SQL migrations are generated from the schema (`drizzle/`). Queries are plain Postgres.                                                     |
| **PGlite locally**                       | A real Postgres 17 running in-process (WASM), persisted under `./data/pg`. Zero setup, works on Windows/macOS/Linux, identical semantics to Supabase. |
| **`DATABASE_URL` switch**                | Set it to a Postgres/Supabase connection string and the same schema, migrations and queries run there. No rewrite.                          |
| **Own auth (cookie sessions, bcrypt)**   | Students often have no email; invitation codes create username-only logins. Sessions are DB-backed so deactivation is immediate.           |
| **sharp**                                | Uploaded photos are auto-rotated (EXIF), downscaled to 2000px and re-encoded as JPEG so review pages are predictable. HEIC converts client-side. |

### Authentication and database access

Qalam uses its own server-side sessions and connects directly to PostgreSQL.
The server enforces tutor/student/family permissions. The security migration
also enables RLS and removes table privileges for Supabase browser roles.
There are deliberately no browser RLS policies: this app does not use Supabase
Auth. Run migrations as the table owner; the server connection must retain
owner access. Do not expose the database URL or storage secret to the browser.

## Architecture

```
src/db/schema.ts        every table (35), TypeScript unions for statuses, relations
src/db/seed.ts          realistic demo data, all dates relative to today
src/db/curricula.ts     seeded curriculum templates (flagged "draft — verify against spec")
src/lib/auth.ts         sessions, password hashing, current user, tutor "view as"
src/lib/access.ts       who may see which student; visibility levels per role
src/lib/domain.ts       pure rules: coverage, revision derivation, package counting
src/lib/queries.ts      workspace loader + dashboards (everything derived, nothing duplicated)
src/lib/mutations.ts    all writes: session log, mastery, homework, review, tests, invitations…
src/lib/dates.ts        Asia/Qatar formatting, week helpers, blackout dates
src/lib/i18n.ts         t() over src/messages/en.ts; add ar.ts with the same shape for Arabic
src/app/tutor/*         tutor portal (server components + src/app/tutor/actions.ts)
src/app/student/*       student portal (photo submission is the one rich client component)
src/app/parent/*        parent portal with family child switcher
src/app/api/uploads     photo/PDF upload → sharp → private Supabase storage (local in development)
src/app/api/files/[id]  HMAC-signed, expiring file URLs (S3-style capability URLs)
```

Key rules, all in `src/lib/domain.ts` and `src/lib/mutations.ts`:

- **Mastery** has one write path (`setMastery`), which also appends history. Session
  logs, homework reviews, test results and manual overrides all use it, so coverage,
  revision plans and progress views can never disagree.
- **Coverage** = share of in-scope topics taught (any mastery beyond *not started*).
- **Revision status** for a test topic is derived from mastery unless the tutor sets it
  explicitly.
- **Package counting**: completed and no-show count; tutor cancellations, reschedules and
  future sessions never count; family cancellations inside the late-cancellation window
  (24 h, per tutor setting) count; a tutor override with a reason always wins.
- **Overdue** homework is computed at read time — nothing depends on a cron job.
- **Recurring sessions** are materialised from weekly schedules six to eight weeks ahead,
  skipping blackout dates; adding a blackout cancels affected sessions as tutor-cancelled.

## Configuration

Copy `.env.example` to `.env` if you want to change defaults. Without a `.env`:
the embedded database is used, demo logins are on in development (off in
production unless `DEMO_LOGINS=true`), uploads go to `./data/uploads`.

## Deploying (Supabase + Vercel)

1. Create a Supabase project; copy the Postgres connection string into `DATABASE_URL`.
2. Run `npm run db:migrate` against it (locally, with the env var set).
3. Set `AUTH_SECRET` (long random string), `TUTOR_EMAIL`, `TUTOR_NAME`,
   `TUTOR_INITIAL_PASSWORD`, `DEMO_LOGINS=false`, `APP_URL=https://your-domain`.
   On first visit to `/login` the tutor account is created from these values
   (the demo seed is not used in production).
4. Deploy to Vercel.

**File storage:** create a private `qalam-uploads` bucket and configure
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`
in Vercel for each environment that needs uploads. The key stays server-side.
Uploads are limited to 4 MiB per file and 20 files per submission, leaving room
for multipart headers under Vercel's 4.5 MB request limit. Photos are normalized
to JPEG. File downloads require a short-lived signed link.

Production refuses to fall back to local disk when storage is not configured.
Local development without any Supabase settings still uses `UPLOAD_DIR`.
Existing local files are not automatically migrated to object storage.

`AUTH_SECRET` signs file URLs, not login sessions. Set a unique random value of
at least 32 characters. Changing `TUTOR_INITIAL_PASSWORD` does not reset an
existing tutor account; it is only used when the account is first created.
See `SECURITY_REVIEW.md` for deployment checks and remaining work.

## Tests

```bash
npm test
```

Runs against an in-memory PGlite database seeded with the demo data: guardians
cannot read another family's student, students cannot read each other, private
feedback never reaches families, only the owning student can submit homework,
tutor-only mutations reject other roles, the package late-cancellation rule,
and the guardian-first invitation flow.

## Localisation

Every UI string goes through `t()` from `src/lib/i18n.ts`, backed by
`src/messages/en.ts`. The document `dir` attribute follows the locale, so adding
Arabic is a matter of providing `ar.ts` and switching `getLocale()`. Dates and
times are always rendered in the tutor's timezone with UK conventions.
