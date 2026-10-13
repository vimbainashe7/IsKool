# Admin workspace redesign

Date: 2026-10-07. Scope: Admin main content, preserving the existing IsKool shell and navy/cream/gold palette.

## Reference translation

The supplied admin reference establishes the composition: compact named greeting, four metrics, Admissions Pipeline and Upcoming Events, then Fee Collection and Reports Overview. The large navy hero, large development banner, duplicate management button row and dashboard section searches are removed. Global Search IsKool remains intact. The existing development adapter uses the provider's small development-only badge.

Desktop uses four summary cards and a two-column operations grid at 1200px and above. Tablet uses two metrics per row and stacked operation panels. Mobile prioritizes greeting, attention, metrics, admissions, events, fees and reports. Panels use theme tokens, restrained warm borders, scoped gold accents, compact metadata and accessible headings.

No screenshot numbers, historical trends, application stages, attendance rates, currencies, payments or report jobs were fabricated. With no application lifecycle or finance ledger in the current contract, the funnel and fee ring remain honest unavailable states. Enrollment bars display actual active student membership counts; the fee ring displays no rate and cannot imply a collection percentage.

## Preservation

The existing sidebar, all navigation labels/routes, sidebar width, branding, active states, footer and top bar are untouched. `AppSidebar`, `SiteHeader`, `DashboardShell`, navigation configuration, session/role routing, capability definitions, API handlers, Supabase reads/mutations, storage, database schemas and RLS files were not changed by this task. The server selects the Admin composition only after the existing session/capability check and authorized workspace load. Student and Teacher branches remain intact.

The actual enrollment URL remains `/admin/enrollments`. Student and Teacher person details use the existing `/admin/users/[memberId]` route. No unsupported detail routes were added. No deployed environment was configured and no live Supabase/RLS verification is claimed.

## Data integration

| Dashboard widget | QA source | Production integration and limits |
| --- | --- | --- |
| Students, enrolled students, teachers | DEVELOPMENT FIXTURE | Existing authorized LIVE DATA adapter retained; counts reflect loaded records, not an uncapped school census. |
| Attendance metric | BLOCKED | No attendance records or rate contract. Displays Unavailable. |
| Needs attention | DEVELOPMENT FIXTURE | Existing membership states and class links: invited/suspended memberships, active students without classes and classes definitely missing active teachers. Capability-filtered deep links apply the relevant page filters. |
| Admissions Pipeline | BLOCKED applications; DEVELOPMENT FIXTURE enrollment snapshot | No admission stages or conversions exist. Available active enrollment counts appear separately, without pretending to be application stages. |
| Upcoming Events | BLOCKED school calendar; DEVELOPMENT FIXTURE timetable | No school event source. Today's actual recurring lessons use Africa/Harare time and class links. |
| Fee Collection | BLOCKED | No billing, payment or currency contract. No amounts, percentage or simulated finance data. |
| Reports Overview | DEVELOPMENT FIXTURE record shortcuts; BLOCKED generation | Links open Students, Enrollment, Teachers and Audit records. No generated report status, PDF or export is simulated. |

The existing optional-source warnings distinguish unavailable People, Timetable and Audit sources from empty records. Their page states offer a retry through the existing workspace refresh API. Duplicate memberships/class links are deduplicated. Active student membership counts exclude invited/suspended accounts. A teacher membership absent from the loaded projection does not falsely classify an existing assignment as unassigned. Room and teacher overlap checks use actual loaded timetable periods, excluding adjacent periods and unnamed rooms.

## Routes and visual treatments

| Route | Treatment |
| --- | --- |
| `/admin/dashboard` | Compact greeting, four metrics, actionable attention strip, reference-inspired operations grid. |
| `/admin/classes` | Metrics, search/assignment filter, compact class cards and two management form cards on wide screens. |
| `/admin/classes/[classId]` | Context, teaching assignments, scheduled lessons, enrolled learners and coursework cards; safe existing action destinations. |
| `/admin/timetable` | Summary metrics, week/today, class/teacher filters, day cards, school-local times and overlap list. |
| `/admin/users` | Membership metrics, name/ID search, status/role filters, semantic desktop table, mobile rows, invitation card and header anchor. |
| `/admin/users/[memberId]` | Profile/membership, confirmed roles/access and school-wide access activity cards. Audit records are not misrepresented as person-specific events. |
| `/admin/students` | Student/enrollment summaries; class, status and enrollment filters; table/mobile list; existing profile links. |
| `/admin/teachers` | Membership/assignment summaries; class, status and assignment filters; table/mobile list; existing profile links. |
| `/admin/enrollments` | Enrollment summaries, honest admissions/enrollment card, class-filtered enrollment records and existing confirmed enrollment form. |
| `/admin/roles` | Access summaries, real role definitions/capability lists, filtered membership table and existing confirmed person access changes. |
| `/admin/audit` | Actual loaded event-category counts; action, actor, text and school-date filters; compact semantic table. |
| `/admin/attendance` | Unavailable metrics, exception/register cards and actual scheduled classes, without claiming attendance was marked. |
| `/admin/finance` | Unavailable fee metrics/ring, payment/balance/follow-up panels; no fabricated currency or ledger. |
| `/admin/staff` | Teacher/Admin account counts, distinct unavailable HR/leave states, and clearly labeled access memberships rather than an employment roster. |
| `/admin/reports` | Searchable report catalogue; available record links, unavailable report categories and an honest generated-report state. |
| `/admin/settings` | School configuration status card and existing account/appearance settings link. |

All existing mutation payloads, API contracts, confirmation dialogs, validation and mode restrictions are preserved. Admin invitation, enrollment, class creation, teacher assignment and roles/access forms remain connected to the existing server-confirmed development adapter; live writes remain disabled by the existing backend contract. UI action permissions match existing action capabilities.

## Components and files

`src/features/admin-workspace/` contains the scoped design system and composition:

- `admin-components.tsx`: AdminAccess, AdminLink, AdminMetricCard, AdminSectionCard, AdminPageHeader, AdminEmptyState, AdminStatusBadge, AdminListRow and retry control.
- `admin-dashboard.tsx`: dashboard, attention and four operation panel types.
- `admin-records.tsx`: searchable/filterable people and class/enrollment presentations.
- `admin-pages.tsx`: metrics, class details, timetable, roles, audit, report catalogue and unavailable operation surfaces.
- `admin-workspace.tsx`: Admin-specific view composition.
- `admin-workspace.module.css`: theme-aware responsive styles isolated from other roles.
- `model.ts`: deduplicated projections, school-local dates and timetable overlaps.
- `admin-loading.tsx`: loading composition, used by Admin root/dashboard route loading files.

Updated `src/features/workspace/workspace-page.tsx` to select the Admin branch after authorization. Updated `src/features/admin/admin-workspace.tsx` to reuse the new read presentations while preserving confirmed actions. Added projection/browser tests, `playwright.admin.config.ts` for the existing port-3000 preview and `scripts/capture-admin-workspace.mjs`.

## QA and evidence

Baseline lint/typecheck/build passed and all 62 existing unit tests passed. Final gates: `pnpm.cmd lint` passes with zero errors and the one existing TanStack `react-hooks/incompatible-library` warning; `pnpm.cmd typecheck` passes; `pnpm.cmd test --maxWorkers=1` passes all 70 tests across 8 files; `pnpm.cmd build` passes, generating all 23 static pages. `pnpm.cmd check:secrets` passes: 36 browser JS/map files scanned without private secret references or configured private values.

All 18 Admin browser scenarios passed: 16 routes at 1440×900, 1280×800, 1024×768, 768×1024, 390×844 and 360×800; dashboard accessibility at all six sizes; every secondary route at desktop/mobile; all 13 Admin sidebar destinations; attention drill-down filters; keyboard links; timetable/report filters; dark dashboard content; reduced motion; and honest unavailable finance/attendance states.

The first run revealed a too-tall primary dashboard row, a brief button-opacity contrast transition during hydration, and invitation text contrast just below AA. The final layout is tighter, scoped button transitions exclude opacity, checks wait for workspace hydration, and the gold text is darkened. An early sidebar check navigated faster than each destination rendered; it now waits for the destination heading and hydration. The final full Admin run passed all 18 scenarios in 4.3 minutes.

The existing Admin search/detail/role-change/context/logout regression passes, including server confirmation and persistence after reload. Four Student/Teacher dashboard regression scenarios pass. After the final contextual-action improvement, the Admin sidebar/filter/keyboard scenario passes again, including selecting English 4A from its Assign teacher link. Confirmation copy names the selected person and class. No live database or production RLS acceptance is inferred from these fixtures.

Accessibility checks use axe WCAG 2 A/AA and WCAG 2.1 AA tags, plus keyboard navigation, labeled filters, semantic tables/headings, visible focus, reduced-motion and dark-mode checks. The final dark-mode/reduced-motion/unavailable-operations scenario passes again and its 1440px screenshot is refreshed. Dark-mode axe is scoped to Admin main content: the unchanged shell/footer is not claimed as newly certified. All six widths have no document horizontal overflow. Existing route authorization and action-capability checks remain in place.

`evidence/admin-redesign/` contains BEFORE/AFTER desktop/mobile captures for all 16 routes, all six dashboard sizes and a dark dashboard. Each Admin route was rendered and its screenshot visually inspected. Final captures hide only the Next.js development overlay in the capture browser, without changing application shell code.

Compare [desktop before](evidence/admin-redesign/before-dashboard-1440.png) with [desktop after](evidence/admin-redesign/after-dashboard-1440.png), and [mobile before](evidence/admin-redesign/before-dashboard-390.png) with [mobile after](evidence/admin-redesign/after-dashboard-390.png).

## Remaining backend work

Application lifecycle, school calendar events, attendance/register services, billing/payments/currency, HR/leave records, report/export jobs, school configuration, complete membership profiles/guardians/history, uncapped server pagination/aggregates and audited live mutations remain absent from the existing frontend contract. Their interfaces are intentionally designed unavailable states. See `BACKEND_CONTRACTS.md` for the existing service dependencies. Supabase deployment and tenant/RLS verification remain separate acceptance work.
