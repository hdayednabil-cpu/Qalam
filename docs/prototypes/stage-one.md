# Stage 1 flow prototype, pass 1

Base: design/polished-workspace at f93c623fd45ab8bec5ff3aebc0f539a3384b590b.
Branch: design/stage-one-prototype. Entry: /prototype.

## Scope and ownership

New files only: src/app/prototype/page.tsx, prototype.tsx and prototype.css under qalam/; this handoff under docs/prototypes/. No shared design-system files changed. No lib, configuration, server actions, account logic, database or tests changed. Prototype data is synthetic and held in React state. Refresh resets it. No email, uploads, AI or backend persistence is implemented.

## Walkthrough

1. Continue with the sample email; simulate the verification link.
2. Add a second child, optionally add school/year, save.
3. Review waiting cards; update details; simulate a first booking.
4. Open Scheduling. Open a lesson to inspect it without editing.
5. Set a weekly pattern for two sample weeks. The default overlaps existing lessons; review the conflict, go back, choose 7 pm, review and save.
6. Open a lesson, choose cancellation, inspect scope, fee, access consequences and message state, then save. Cancelled lessons remain visible.
7. Move a lesson; overlapping moves and moves outside the sample date range are blocked.
8. Reset sample from the review banner.

## Presentation contract

Desktop onboarding pairs an editorial navy introduction with a light form. On phone the introduction condenses and forms remain full width. Desktop scheduling is a day-column overview, not yet a proportionate time grid. Phone uses a date strip and day agenda. Dialog uses a desktop side panel and a mobile bottom sheet with native dialog focus containment and Escape dismissal. No background film on these task screens.

## Required production data/actions (Claude implementation)

- Parent signup/verification state and approved family/child records.
- Child setup and optional profile details; secure upload and availability selection are future screens, not simulated controls here.
- Separate approval and booking records; production must enforce access rules server-side.
- Sessions, recurrence series identifiers, exceptions, timezone-aware starts/ends, rates, historical fee snapshots and per-child expiry.
- Pattern preview with conflicts and exact dates; commit the reviewed version only.
- Move/cancel preview with scoped affected sessions, fees, expiry and message intent; save through shared actions.

## Acceptance for this flow review

- Email simulation is explicitly labelled; no input is submitted to a service.
- Multiple children can be added/removed; each requires a name.
- Waiting and booked states are distinct, with a way back to edit details.
- Viewing never cancels a session. Editing requires a specific save action.
- Pattern review lists proposed dates and prevents known overlaps.
- Cancellation displays no charge by default and no family message.
- Temporary sample state can be reset; actual account/calendar behavior is not claimed.

## Deliberate limits for the next design pass

Fixed 15–28 November 2026 date window; no holiday source, combined-child lesson or historical-session scenario yet. Scope selection groups a child's sample lessons; production must use explicit recurrence series IDs. No payment overrides, real verification, setup links, availability, uploads or saving across reloads. No real student data.

First seek approval of information hierarchy and sequence. Then refine calendar time positioning and the remaining approval/paused/multi-parent states before final implementation. Student week, parent year/weekly views and tutor review queue follow this first pair of flows.
