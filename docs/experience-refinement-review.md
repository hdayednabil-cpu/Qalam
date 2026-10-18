# Qalam experience refinement — October 17, 2026

Prepared against draft PR #2 at `9ec5fc606929b7f542bf4676b762915530bcab02`.

**Recommendation: keep the PR in draft until the updated design has passed a real browser walkthrough.** The original redesign provides a cleaner foundation, but its conventional navy cards, hidden mobile priorities and unfinished first-use states do not yet meet the requested premium, distinctive and interactive experience. The local refinement below addresses those gaps and several existing workflow defects discovered during testing. The owner authorized updating draft PR #2 and deploying a preview on October 17. Merging and production deployment remain unapproved. Browser verification of the updated preview is pending.

## Implemented changes

- Custom Qalam learning constellation, violet/teal backgrounds and richer primary actions. Native SVG/CSS adds no new design dependency. The constellation settles over four seconds rather than looping forever; reduced-motion settings disable the effect.
- Tutor dashboard links directly to the next lesson to log or homework to review. Priority counters navigate to relevant queues, and unfinished work appears before the daily calendar.
- Student and parent dashboards provide a clear next action and meaningful first-use guidance. Empty test/progress panels no longer occupy large blank areas. Family session rows use “Summary pending” rather than tutor-only operational language.
- Mobile navigation prioritizes tutor Inbox, student Tests and parent Progress. Overflow routes remain accessible. The mobile header stays visible, account and child-switch targets are larger, and nested page headings are accurate.
- Calendar rows give dates/times room; session selection uses labelled checkboxes with selection counts. Week arrows and blackout inputs have accessible names.
- Login supports password visibility, pending feedback and announced errors. Review, lesson saving, session creation and child switching show their pending state.
- Typed homework accepts a written answer without a photo. Tasks with no attachment requirement can be submitted. Unsuccessful uploads block accidental partial submission; retrying the same file is possible, and preview URLs are released.

## Defects reproduced and fixed

| Scenario | Previous behavior | New behavior |
| --- | --- | --- |
| Corrections → resubmission → approval | Correction task remained open | Related open correction tasks close |
| Old tutor review tab | Could overwrite a newer submission | Rejected, latest work reloaded, explanatory banner shown |
| Duplicate submission clicks | Could race while creating versions | Homework row locked; one submission persists |
| Private or parent-only review feedback | Copied into the student's inbox | Notification respects visibility |
| Private assessment reflection | Returned in family workspace queries | Removed for student/guardian viewers |
| Group lesson/private session notes | Family queries included private notes and other pupils' details | Query boundary filters those fields and pupils |
| Foreign page comment or invalid mastery update | Could save an invalid annotation or partially update review state | Validated and rolled back atomically |
| Invalid student in lesson log | Session could become completed before rejection | Whole operation rolls back |
| Rescheduling | Parent notification opened student route | Each role receives its own route; repeated reschedule is rejected |
| No-show form | Student IDs disappeared with completed-session fields | Student attendance is updated for no-shows |
| No selected students | Created an orphan calendar event | Rejected before creation; empty-student form cannot submit |
| Incorrect assessment topic | Could still show 100% revised | Topic is marked as needing work |
| Parent package/attendance labels | Used-versus-remaining mismatch; “—%” | Remaining bar matches label; clear first-session message |

These defects were discovered while testing the existing application; this review does not claim that PR #2 introduced all of them. New filtering prevents future disclosure through these paths; it does not remove previously stored notifications from the hosted database.

## Verification

The test suite uses isolated synthetic accounts and real application queries/mutations with an in-memory Postgres-compatible PGlite database. The integration flow adapts the request cookie jar and Next cache invalidation while exercising real sign-in, file upload/download, submission and authorization logic.

New scenarios cover the full corrections lifecycle, stale review recovery, typed/attachment-free submissions, duplicate requests, invalid annotations and rollback, first-time learners, assessment results, parent switching across three children, foreign-child selection, private data boundaries, session rescheduling, package accounting, no-shows, repeat schedule generation and mobile route selection.

**Final results: 52/52 tests passed across 8 files; production build passed, including TypeScript checks; whitespace validation passed.** Twenty scenario checks were added beyond the prior 32-test suite.

Validation commands (from `qalam/`):

```sh
npm test
npm run build
git diff --check
```

The local build is run with remote database/storage/bootstrap variables unset. No hosted data is changed. No schema migration or dependency update is required.

## Evidence limits and next review

The original preview was inspected on desktop as the tutor and through the tutor's student/parent previews. Those previews retain tutor permissions. Independent role access is covered by the local integration tests, not by that browser session.

The revised local build cannot be reached by the available browser. Mobile route selection is tested in code; viewport layout, keyboard behavior, touch interactions, upload UI recovery and animation quality still require a real browser pass. Automated business-logic tests and a successful build are not visual approval or a production performance audit. Remote Postgres/Supabase and real-device camera upload are not exercised by the local suite.

After explicit authorization to update the draft branch and create a Vercel preview:

1. Check login, tutor, student and parent pages at 390px, 768px and desktop widths, including keyboard and reduced-motion modes.
2. Use separate synthetic student and guardian sessions, not only tutor preview mode. Switch all three children and verify their data.
3. Assign photo, typed and attachment-free work; upload/reorder pages; request corrections; resubmit; approve; check both inboxes and progress.
4. Open two tutor review tabs, submit a new version, then attempt the stale review and verify the recovery banner.
5. Create, move, cancel and log lessons, including no-shows; verify family package balances and notification destinations.
6. Check slow/failed upload feedback, mobile camera/file selection, overflowing text, fixed navigation and the More dialog.
7. Approve the design only after these visual checks and the user's review. Merging and production deployment require separate explicit authorization.

## October 18: responsiveness and detail pass

Follow-up to the owner's preview feedback: many actions felt frozen, secondary tabs lacked motion, and backgrounds felt too plain.

- Added a shared Next.js link wrapper using the router's actual pending state. Pending navigation shows a top progress strip, a readable status and a local link cue; no timer-based pretend progress. Native link semantics and framework prefetching are preserved.
- Added root and role-specific loading boundaries, so dynamic routes can display a loading layout while content arrives. Added short workspace arrival motion across tutor, parent, student and account routes.
- Converted 36 remaining server form submit buttons to shared pending feedback. The shared control preserves space for its pending state, disables duplicate submission and only announces the selected action in multi-button forms. Small icon controls retain accessible labels.
- Added explicit search, invitation activation, clipboard and homework submission statuses. Clipboard rejection now has a visible error. Login/password status accessibility improved.
- Added lightweight server-rendered book and geometry outlines, layered violet/teal backgrounds and tactile hover/press states. Decorative movement settles; reduced-motion settings disable movement. Artwork requires no image downloads or animation loop.
- Parallelised independent workspace database reads after authorization. Roster work is bounded to two workspaces concurrently. Search loads each workspace once; the dashboard reuses session data. Completed group lessons now count once.
- Added four regression tests for search query counts/results, dashboard session reuse/group lesson counting, personal-package precedence/freshness and authorization before workspace reads.

Validation: 56 tests passed across nine files; production build, type validation and diff whitespace checks passed. Tests use synthetic isolated local data. Production response-time savings are not yet benchmarked. Large rosters still need dedicated batched summary queries for scale.

Browser verification limitation: the prior automation attempt was rejected by the browser's automatic security review. No alternate browser or indirect bypass was attempted. Authenticated/mobile visual review of this revision, slow-network navigation, focus behaviour and real device camera/upload interaction remain pending. Screenshots and recordings supplied by the owner can inform the next pass.

Recommendation remains to keep PR #2 in draft until the owner has reviewed the refreshed preview and authenticated/mobile appearance is verified. No production release or merge is authorized by this work.

The broader student-first AI product proposal, competitor findings, preliminary token-cost scenarios and required pilot inputs are in `docs/ai-first-product-plan.md`. Those are proposals, not implemented capabilities.

## October 18: smooth interaction and slim roster pass

Owner requested more distinct hover motion/colour, smoothness and responsiveness, plus continuous logo motion.

- Hover states now distinguish actionable buttons, navigation, task rows and student cards with short lift/shift, violet colour changes, clearer borders and restrained depth. Press feedback completes quickly (70 ms transition); navigation is never deliberately delayed for animation. Keyboard focus retains a clear ring and edge cue. Touch devices do not receive the new mouse-hover effects.
- The wordmark and learning constellation now drift continuously using CSS transforms. A small IntersectionObserver pauses each decorative animation offscreen. Hidden browser tabs pause them too. A shared pause/resume control persists its preference; device reduced-motion settings take priority. Mobile exposes the control inside More navigation to preserve header space.
- Animated progress fills use scale transforms instead of changing width. No new animation library, frame-by-frame pointer listener or video background was added.
- Student rosters now fetch dedicated summaries instead of full workspaces. Six ancillary query branches per student are omitted (guardians, schedules, subjects, next steps, feedback and resources). Homework selects status and due date without submissions/pages. Assessments omit results and notes. Access checks, alerts, packages, next sessions and sorting are preserved; there is no cross-request user-data cache.
- Added four regression cases proving summary equivalence for tutor, guardian and student roles and checking omitted queries/payloads. The full suite now passes 60 tests across nine files.

Live latency and animation frame rates have not been measured. The previously rejected browser automation remains blocked; authenticated/mobile visual assessment of this revision is still pending. No production deployment or merge is part of this pass.

## October 18: animation feedback and connection-limit incident

Owner feedback: remove all animation play/pause controls and make logo motion easier to notice. Removed the control, localStorage preference and context from login, activation, account, desktop header and mobile More menu. Logo loop is now 3.2 seconds (was 5), rotating ±5° (was ±2°); constellation loop is 9 seconds (was 14). Hidden-tab/offscreen work remains paused automatically, and device reduced-motion settings remain respected. No video assets were integrated in this change.

Investigated the reported “Something went wrong” via Vercel runtime logs, not browser automation. On the preceding preview `dpl_7cYQ4yBYN7WdhaY7a8MiPshBSiyz`, October 18 10:21–10:25 UTC logs show Supabase `EMAXCONNSESSION`, session-mode limit 15, on tutor, student, parent and account reads. Earlier parallel reads and speculative navigation may increase demand; this is a real deployment/database configuration mismatch, not expected preview behaviour. No query parameters, account identifiers or raw sensitive log records are copied here.

Runtime correction: on Vercel only, known `aws-*.pooler.supabase.com` session endpoints use documented transaction port 6543 with the same credentials/database/TLS settings. Arbitrary hosts and existing transaction URLs are unchanged. Per-process pool drops from five to two clients, releases idle clients after one second, has a bounded connection wait and handles idle-client error events. The migration command explicitly preserves the supplied session/direct connection. No named prepared statements, LISTEN or session-level advisory locks are used in current app queries; explicit Drizzle transactions still retain one client through commit/rollback. Reference: https://supabase.com/docs/guides/database/connecting-to-postgres and https://node-postgres.com/apis/pool . Hosted credentials are intentionally opaque in the connector; the runtime uses its existing secret without exposing or replacing it.

Validation: all 67 tests across 10 files pass; production build/type validation and diff checks pass, including seven endpoint/TLS/credential-preservation and connection-routing test cases. Existing isolated database scenarios still pass. This is a targeted correction supported by error logs; hosted recovery and actual latency still need confirmation on the new deployment. Existing browser-automation rejection remains in force. Do not infer hosted verification from local tests or a READY deployment.

Export explanation: the real tutor profile includes Export data (JSON), a structured per-student download for portability/privacy requests. It contains profile/enrolments/schedules, mastery/history, sessions, homework/submission metadata, assessments, next steps and feedback. It is not a preview-only diagnostic and is not a polished parent-facing report. No export UI or endpoint changes in this pass.
