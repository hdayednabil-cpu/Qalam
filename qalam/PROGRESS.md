# PROGRESS

Status as of 14 September 2026. "Verified" means it was exercised in the build
container: `npm run build` passes, `npm run db:reset` seeds from clean,
`npm test` passes (10 tests), and every route was fetched with a real session
for each role.

## Built and verified

### Foundation
- Next.js 15.5 + TypeScript + Tailwind 4, Drizzle ORM (Postgres dialect), embedded PGlite locally, `DATABASE_URL` switch to Postgres/Supabase.
- Brand system ("Qalam"): warm walnut/brass/sage token palette in `globals.css`, Fraunces (display) + Inter (body), cards, badges, rings, progress bars, avatars, empty states; sidebar + mobile bottom nav.

### Visual redesign (19 September 2026)
- New premium palette (walnut ink, brass/gold accent, sage, terracotta, dusk glass) replacing the original cool blue-teal scheme — same CSS token names throughout, so no component call sites needed renaming.
- `OrreryMark` / `OrreryHero` (`src/components/orrery.tsx`): an original, licence-free CSS/SVG animated concentric-ring "orrery" brand motif (small in the sidebar wordmark, large on the login hero), inspired by the reference mood board rather than copying it.
- `AmbientBackground` (`src/components/ambient-background.tsx`): warm drifting gradient glow + faint receding arch outlines behind the login hero panel — pure CSS/SVG, no stock imagery, no client JS.
- `src/components/motion.tsx`: framer-motion primitives (`Reveal`, `Stagger`/`StaggerItem`, `CountUp`, `MotionRing`, `MotionProgress`) used for staggered entrance animation and animated stats on the tutor/student/parent dashboards and the login page.
- All motion respects `prefers-reduced-motion` (disabled globally under that media query in `globals.css`).
- Verified: `npm run build`, `npm test` (10/10), and a Playwright screenshot pass of the login page (desktop + mobile) and all three dashboards on the production build.
- i18n layer (`t()`, `en.ts`, RTL-ready `dir`), Asia/Qatar date utilities (DD/MM/YYYY, 12-hour, Sunday week start).
- 35-table schema with SQL migration; realistic seed (6 students, 4 families incl. three siblings, 96 sessions, 13 homework, 3 submissions with page images, 4 tests, feedback, next steps, resources, invitations, notifications).

### Auth and access
- Email-or-username login, DB-backed cookie sessions, bcrypt, login throttling, sign-out everywhere on deactivation.
- Invitation codes (prefix–name–6 unambiguous chars, 14-day expiry, single use, revoke/regenerate), guardian-first activation rule, attempt throttling.
- Demo login buttons (on in dev; off in production unless enabled). Production tutor bootstrap from `TUTOR_EMAIL`.
- Server-side authorisation in one module; feedback visibility (private / student / parents / family) filtered in queries; tests cover cross-family and cross-student access.
- Tutor "view as student" / "view as parent" with a banner and exit.

### Tutor
- Dashboard: sessions to log, homework awaiting review, overdue homework, upcoming tests with revision %, students needing attention (rule-based alerts), this week's sessions, next actions.
- Students list with coverage, package, alerts, next session; onboarding form (student → family/guardian → curriculum → weekly slot → package → invitation codes).
- Student workspace: overview rings per subject, strengths/weaknesses, package counter, next session, next steps (add/complete), private notes + important note, full curriculum with per-topic mastery override / set current / include-exclude, session history, homework, tests, feedback with visibility + copy/WhatsApp, accounts and invitation codes, JSON export.
- Session log: topic picker grouped by section with search, mastery per topic, per-topic note, next-steps checklist, private assessment, shared one-line summary, plan for next (becomes a next step), quick homework, no-show; status changes, package override with reason, reschedule (original kept as "rescheduled").
- Homework: assign form (free-text type, priority, due date/time, estimated minutes, submission requirement, link, linked topics); review screen with full-size pages, per-page comments, overall feedback with visibility, score, mastery update for linked topics, approve / request corrections; version history.
- Tests: create with topics → revision plan derived from mastery, explicit status override, share summary; record free-form result, tick "went wrong" topics (→ needs work + next step), shared/private comments.
- Calendar: week grid (Sun–Sat, blackout shading, today highlight, colour by state), three-week upcoming list, one-off sessions (multi-student), blackout dates (auto-cancel), generate upcoming sessions from weekly slots.
- Invitations & accounts page: all codes with state, copy/WhatsApp, revoke/regenerate, deactivate/reactivate, reset password.
- Search (students, topics, homework, tests, resources), inbox, curriculum templates with paste import.

### Student
- Dashboard: next session (+plan), current homework, upcoming test with what's still to revise, last session summary, current topic, areas to practise, achievements, progress bars, tutor's important note, shared feedback.
- Homework list (to do / waiting / done) and detail; photo submission: take photo or add pages (multi), client-side HEIC→JPEG (heic2any, lazy-loaded), client downscale, upload with progress, reorder/remove, comment, submit/resubmit (versioned); shows own submission and per-page feedback; "I've started this".
- Sessions (upcoming + what we covered), progress (full curriculum with mastery dots), tests & revision plans + results, resources, inbox.

### Parent
- Family child switcher (cookie, validated server-side).
- Dashboard: month overview, package counter, homework status, attendance, upcoming test with readiness + revision plan, next/last session, performance (coverage, strengths, areas to improve), latest feedback.
- Sessions (package rules explained, upcoming, history with shared summaries only), homework, tests & results, progress, feedback, reports (live figures + placeholder), inbox.

### Infrastructure
- Upload API (image → sharp rotate/resize/JPEG; PDF stored as-is; 15 MB / 20 pages; ownership checks). Signed, expiring file URLs.
- Notifications on submission, review, corrections, homework assigned, session logged/moved, results, feedback, activation. Audit log for key writes.
- Per-student JSON export (tutor or family).

## Partially built
- **Reports (Tier 2)**: schema + parent page with live monthly figures; no draft/publish workflow or PDF yet.
- **Resources (Tier 2)**: seeded library, shown to students/tests/search; no tutor UI to add resources.
- **Notifications (Tier 2)**: in-app inbox only; no email/push.
- **Calendar**: week and upcoming views; no month grid or day view; no drag-and-drop.
- **i18n**: all navigation, statuses, labels and most copy go through `t()`; a handful of helper sentences on tutor forms are still inline English. No `ar.ts` yet.
- **Curriculum templates**: seeded outlines for Edexcel IGCSE Maths A, IB AI, IB AA HL, IGCSE Physics and a school Grade 8/9 scheme are flagged *draft* — verify against the official specifications before relying on them.

## Not built
- Supabase RLS policies (authorisation is application-level; tested).
- Supabase Storage adapter (uploads go to local disk; see README deployment caveat).
- Email delivery (invitations are shared by copy/WhatsApp), push notifications, PDF export.
- AI drafting of report text (`AI_DRAFTING` flag reserved).
- QR-code handoff, payments, calendar sync, in-app chat, PWA/offline, multi-tutor UI (schema is tenant-ready via `tutor_id`).
- Editing an existing schedule slot from the UI (create on onboarding only; edit in DB for now).
- Editing/deleting homework, tests or feedback after creation.

## Known issues
- Dashboards load one workspace per student (fine for a single practice of ~30 students; would need targeted queries at 200+).
- PGlite must not be opened by two processes at once (e.g. `npm run db:seed` while `npm run dev` is running). Stop the dev server before running database scripts.
- The `next dev` first request is slow (~10 s) while PGlite loads; subsequent requests are fast.
- Server-action forms show no inline success/error state beyond the page refreshing; validation errors surface as thrown errors (Next error boundary).
- Package "used" counts are recomputed from sessions, so packages shared by siblings are correct but the parent page shows the family total, not a per-child split.

## Suggested next improvements
1. Tutor UI to add resources and attach them to topics/tests.
2. Monthly report draft → edit → publish flow (data snapshot already modelled), then PDF.
3. Supabase Storage adapter + RLS policies, then Vercel deployment.
4. Edit forms for schedules, homework, tests, feedback; inline form feedback (useActionState) across tutor forms.
5. `ar.ts` and a locale switch; RTL check of the mobile nav.
6. Month calendar grid and iCal export.
