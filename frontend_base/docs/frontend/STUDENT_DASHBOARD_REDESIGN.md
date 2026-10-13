# Student dashboard visual rebuild

Date: 2026-10-07. Scope: `/student/dashboard` main content only.

## Design translation

The supplied LMS reference controls composition: compact welcome banner, visual course cards, recent feedback/progress, and an independent desktop calendar/task rail. Existing IsKool navy/cream/gold tokens, Segoe UI typography, sidebar, header and routes are retained. Decorative subject visuals use local Lucide compositions; no downloaded art, reference text or invented certificates.

The welcome card is 166px on desktop and 164px on mobile. Desktop at 1200px and above uses a main column plus right rail; tasks follow the calendar immediately. Course cards display at most three enrolled classes; the preview fixture contains only two, so two are shown. Tablet uses two cards per row. Mobile prioritizes welcome, tasks, courses, today's schedule, feedback/progress, then calendar. Dashboard section searches and the duplicated quick-action row are removed.

## Data and architecture

The existing server `WorkspacePage` session/capability check and `loadWorkspace` projection remain authoritative. A conditional student-dashboard composition is selected after authorization and loading. Other roles still use the original `PageShell`/`WorkspaceView` path. The provider adds an optional compact preview badge; its default banner behavior is unchanged elsewhere, and the student badge is suppressed in production.

- Courses: current enrolled classes, available teacher names, published assignment counts, own submission counts and published resources. The progress bar explicitly means assignments submitted, not lesson completion.
- Tasks: published enrolled-class assignments, excluding own submitted work; returned work is actionable. Sort order is overdue, today, future and undated.
- Calendar: real assignment deadlines from the existing snapshot, school-local dates in Africa/Harare, month navigation, selected-day deep links. No extra database query or fabricated event dots.
- Schedule: today's real timetable slots. Optional schedule warnings retain the other widgets and offer a refresh.
- Feedback: only released own grades linked through own submissions. Zero is preserved; unknown total marks do not produce percentages.
- Empty feedback: honest coursework/resource counts and useful empty copy, not certificates or streaks.

There are no changes to Supabase queries/types, RLS, auth/session, capability definitions, sidebar, top bar, role routes or Teacher/Admin dashboard code. Preview captures use the existing explicitly enabled development adapter. No deployed Supabase environment was added or claimed verified.

## Components and files

Added `src/features/student-dashboard/`:

- `student-dashboard.tsx`: composition and welcome banner.
- `student-courses.tsx`: course grid, cards and subject icons.
- `student-calendar.tsx`: calendar, selected-day links and optional retry.
- `upcoming-tasks.tsx`: task groups/rows and schedule strip.
- `student-feedback.tsx`: recent feedback and honest progress fallback.
- `student-dashboard-skeleton.tsx`: layout-specific loading state.
- `student-dashboard.module.css`: scoped responsive and theme styles.
- `model.ts`: pure projections and school-date helpers.

Added route loading file `src/app/(dashboard)/student/dashboard/loading.tsx`. Updated `src/features/workspace/workspace-page.tsx` and `workspace-provider.tsx` with student-specific branches. Updated the existing workflow test's preview-label matcher and waited for header hydration before its post-context-switch logout click. Added `tests/student-dashboard.test.ts`, `tests/e2e/student-dashboard.spec.ts`, `playwright.student.config.ts` and `scripts/capture-student-dashboard.mjs`.

## Evidence

`evidence/student-redesign/` contains desktop/mobile BEFORE captures; AFTER captures at 1440×900, 1280×800, 1024×768, 768×1024, 390×844 and 360×800; Teacher/Admin comparison captures; and a dark student capture. The existing port-3000 preview server is reused without restarting it. The local Playwright config uses that server and a larger timeout for the longer cold-compilation workflows. CI/default config remains unchanged.

During QA, browser console checking identified a locale-dependent `data-day` hydration mismatch in the existing CalendarDayButton. The student calendar wraps that existing component with deterministic ISO day attributes; the shared primitive is unchanged. Existing global reduced-motion styles use a near-zero duration, which the check honors. Keyboard course links, all ten sidebar destinations, calendar navigation/date selection, overflow, compact hero size and axe are covered.

Baseline lint/typecheck/build passed. Final lint passed with zero errors and one pre-existing TanStack gradebook compatibility warning. Final typecheck passed. All 56 unit tests passed (49 existing and seven new).

Final production build passed, including TypeScript validation and generation of 23 static pages. The existing dev server was retained throughout.

All 13 Playwright scenarios passed across the final suite and one isolated rerun. The full run passed 12 scenarios; its existing 54-navigation responsive regression exceeded its five-minute limit while the production build competed for local resources. With the build finished, the isolated responsive/accessibility regression passed in 3.8 minutes. Teacher grading/upload/persistence, Admin search/role changes/logout, role guards, student upload, all three AI workflows and keyboard drawer/search behavior passed. This is development-preview verification, not live Supabase/RLS verification. The client-secret scan passed. Older screenshots regenerated by the regression test were restored; the dedicated redesign evidence is retained.

Final screenshots were visually inspected at all six requested viewport sizes and in dark mode. Light-mode axe checks pass at all six sizes; the dark check covers the new dashboard content. Shared-header/footer dark-mode styling is outside this task's scope. Keyboard links, sidebar destinations, calendar selection and reduced motion pass. No student browser errors or hydration errors were recorded in the final focused test.

Compare [desktop before](evidence/student-redesign/before-student-1440.png) with [desktop after](evidence/student-redesign/after-student-1440.png), and [mobile before](evidence/student-redesign/before-student-390.png) with [mobile after](evidence/student-redesign/after-student-390.png).
