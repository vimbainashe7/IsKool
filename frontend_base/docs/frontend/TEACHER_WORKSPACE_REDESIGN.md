# Teacher workspace redesign

Date: 2026-10-07. The written Teacher prompt specifies the composition used here: compact greeting, six Quick Links, Today's Plan, Documents and Class Progress. The attached image illustrates a different admin dashboard; its business metrics and sidebar were not copied.

## Scope and preservation

The existing sidebar, navigation configuration, top header, Teacher layout authorization, session context, capabilities, routes, workspace contracts, Supabase read/mutation services, private file access and RLS files are unchanged. The server selects a Teacher-only page composition after the same session/capability checks and workspace load. Student and Admin page branches are retained. Shared Settings layout/account use an explicit Teacher branch; other roles retain their original output. AI tool buttons receive local icon decoration; job, draft and approval behavior is retained.

The local Playwright configuration points to port 3000; the default CI configuration is unchanged. On resuming final QA, the earlier server was no longer running, so a new local preview was started with the existing explicit development adapter configuration.

## Design and route treatments

- Dashboard: 174px light greeting with school-local time, real review queue count, educator icon composition, six capability-filtered Quick Links, independent three-column lower cards at desktop widths of 1200px or more. Mobile stacks plan, submission attention, documents and progress after the two-column quick links.
- Classes: searchable class cards with actual subject, enrollment count, scheduled lesson and upcoming assignment; no fabricated current topic.
- Class detail: context summary, existing create/materials/gradebook/attendance links, class assignments, documents, learners and schedule.
- Assignments: draft/published/due-within-seven-days/review summaries, title/class search, status filter, submission counts and existing editor links.
- Assignment creation/detail: compact header and contained form card around the existing steps, rules, attachment and confirmation workflow.
- Materials: document-status summaries, upload form card and existing searchable document list/status actions.
- Submission review: actual review/late/released/count summaries and existing split submission/grading panels, next/previous student controls and keyboard shortcuts.
- Gradebook: actual context summaries, class/assessment controls and existing editable grid as the primary tool.
- AI Studio: icon feature cards and context summaries around existing configuration, source selection, durable jobs, drafts and approval controls.
- Timetable: week/today selector, school-local times, day cards, current-day highlight and class links.
- Attendance: today's scheduled classes plus an honest unavailable state. There is no attendance API or contract; recording actions and unsupported counts are not simulated.
- Notifications: compact authorized update rows with safe deep links. No dated groups are invented because timestamps are absent.
- Search: existing authorized search hook/API, result-type filter and grouped compact results.
- Settings/account: Teacher-only compact header and Profile, Appearance, Notifications, Account/security cards; existing theme and logout behavior.
- Loading: Teacher route skeleton plus dashboard and class-grid variants.

## Data behavior

All new read-only projections use the existing authorized workspace snapshot. Teacher class assignment is checked again for dashboard/list projections. Completion means unique submitted learner/assignment pairs among known enrollments and published assignments, excluding returned work. The denominator is the known enrollment count times published assignments; no lesson/academic mastery, attendance rate or trend is implied. Unknown denominators show an unavailable measure. Actual zero marks are retained. Published reviews are excluded from attention counts.

Materials have no timestamps, so Documents preserves available records without claiming chronological recency. Notifications likewise have no timestamp groups. Today's plan contains actual timetable class/time/room data, without guessed topics. Attendance and some live mutations remain unavailable under the existing backend contract.

Browser QA uses the existing explicitly enabled development fixtures and simulated services. Live Supabase/RLS operation has not been claimed or configured by this visual task.

## Evidence and verification

`evidence/teacher-redesign/` holds BEFORE desktop/mobile captures for 14 routes, AFTER captures, six dashboard sizes and dark mode. Final results and visual inspection findings are recorded after the last run.

Baseline lint/typecheck/test/build passed: 56 tests, zero lint errors and one existing TanStack gradebook compatibility warning. Six added projection tests cover ownership, unique submission denominators, returned/unpublished work, zero/released grades, school-local dates and unassigned teachers. All 62 unit tests pass.

Final QA resumed on 2026-10-07. All 15 Teacher Playwright scenarios pass: six dashboard viewports, all 13 secondary routes at six widths, desktop/mobile accessibility, keyboard Quick Links, 12 sidebar destinations, class/status filters, timetable selection, dark dashboard content and reduced motion. The first run exposed attendance summary overflow and an unlabeled school-logo upload. Summary content now shrinks and wraps within its card, with smaller text for nonnumeric values; the shared school-branding file input has an accessible name. Submission review reported overflow during the first run but passed direct inspection and the complete rerun without changing its workflow.

Seven existing workflow regressions pass: authentication/recovery, Student role guards/upload/persistence, Teacher assignment creation/material upload/review/gradebook persistence, all three AI job/review/approval tools and Admin search/role changes/context switch/logout. These use the development adapter, not live Supabase.

Production build passed, including TypeScript and 23 static pages. Lint passed with zero errors and the existing TanStack warning; the client-secret scan passed across 36 browser JS/map files. AFTER screenshots cover all 14 routes at desktop/mobile sizes, all six dashboard sizes and a dark dashboard. Dashboard desktop/mobile and the submission, attendance and account mobile captures were visually inspected. The local preview remains at http://localhost:3000.

Compare [desktop before](evidence/teacher-redesign/before-dashboard-1440.png) with [desktop after](evidence/teacher-redesign/after-dashboard-1440.png), and [mobile before](evidence/teacher-redesign/before-dashboard-390.png) with [mobile after](evidence/teacher-redesign/after-dashboard-390.png).
