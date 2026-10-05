# Frontend verification report

Executed locally on 2026-10-04/05 in Windows using Node 26.10, pnpm 12.6, Next 16.1.1 and Chromium. CI is configured for Node 24. No deployment, production data mutation or Linear update was performed.

## Scope and environment

The browser server runs on port 3100 with explicit development-preview flags and no Supabase credentials. Persisted preview records and real uploaded file bytes are isolated by an HTTP-only random session identifier in `.cache/iskool-demo`; this is a test adapter, not production storage. AI output and invitation records are explicit mocks; invitations send no email. Production preview is disabled regardless of its flag.

## Automated checks

Final check outcomes are recorded below after execution. Unit/integration/component coverage includes unsafe callback destinations, callback failures, capability/tenant boundaries, API authentication/origin/input checks, sanitized failures, production write denial, file metadata validation, confirmed submissions, atomic grades/version conflicts, role safety and AI review lifecycles. The gradebook suite uses 30, 50 and 100 learners and verifies one active controlled editor, keyboard movement, invalid marks and preserved edits after failed saves.

| Check | Final executed result |
| --- | --- |
| lint | PASS: zero errors, one TanStack `react-hooks/incompatible-library` warning |
| typecheck | PASS |
| Vitest | PASS: 49 tests across five files (31 domain, 10 HTTP/auth integration, eight component) |
| RLS | NOT RUN: missing isolated local database URL; explicit nonzero exit |
| Workflow E2E | PASS: nine tests, final uninterrupted run 4.1 minutes |
| Supplementary accessibility E2E | PASS: one test, eight public-auth/student pages, 30.4 seconds |
| Production build | PASS: compiled, TypeScript checked, 23 static pages generated |
| Client bundle secret scan | PASS: 36 browser JS/map files scanned; no private secret names or configured private values found |
| Git whitespace check | PASS |
| Production-mode smoke | PASS with preview flag deliberately enabled: demo login redirects to sign-in without setting cookies; workspace API returns 401; forged preview role cookie cannot access admin dashboard |

Additional save-confirmation tests prove a failed refresh after a successful mutation does not turn a confirmed save into a reported failure. Assignment regression coverage proves publishing a saved draft updates that draft rather than duplicating it.

Browser coverage includes unauthenticated protection/invalid links/expired preview session; student direct-route denial and upload/confirm/reload; teacher assignment drafts, materials, sequential review and grade save/reload; all three AI tools with leave/return and review/publication; admin search/detail/confirmed roles/context/logout; Ctrl/Cmd-K and mobile focus restoration; responsive routes and axe.

## Responsive and accessibility evidence

Viewports: 360, 390, 768, 1024, 1280 and 1440 pixels. Critical routes: teacher dashboard/materials/submissions/gradebook/AI, student dashboard/assignment detail, admin dashboard/users. Each is checked for horizontal page overflow. Role dashboard screenshots are in `evidence/`. Automated axe scans use WCAG 2 A/AA and 2.1 AA tags. Keyboard tests cover command search, dialog escape/focus return and grade entry. Automated scans do not replace manual screen-reader, device or full contrast testing.

The final workflow run checked all 54 route/viewport combinations, with no page overflow or browser JavaScript errors. Axe reported zero violations on the five teacher routes and admin users. The supplementary scan passed for sign-in, signup, forgot password, update password, student dashboard, assignment detail, grades and notes: 14 distinct screens scanned in total. Earlier runs exposed and led to fixes for grid render loops, hydration races, drawer focus return and stale unsaved-change handlers; the final workflow run passed without retries.

## Production verification not performed

- Supabase signup/email confirmation, password reset delivery, token refresh across real expiry, live membership switching and sign-out require configured credentials and email service. Their implementation and simulated boundaries are tested, not their deployed behavior.
- `pnpm test:rls` explicitly reports NOT RUN and exits nonzero without `ISKOOL_RLS_TEST_DATABASE_URL`. No local Supabase database was provided. Existing SQL policy findings remain blockers; passing browser route guards is not RLS proof.
- The executable RLS transaction fixture asserts other-student submission/grade/storage denial, private AI job/draft denial, teacher class boundaries and cross-tenant writes. It is expected to reveal the overly broad blueprint policies until backend owners harden them.
- Production uploads, signed file delivery, academic mutations, admin provisioning and AI execution are unavailable until BACKEND_CONTRACTS.md is fulfilled. No fake success is reported for these operations.

## Remaining limitations

Live projections are bounded to 100 records and 1,000 links. Full server pagination/search, production notification read state, guardians/term transfers, finance/HR/attendance/report contracts, database audit actors and production class schedules require backend work. Preview upload files need lifecycle cleanup. The gradebook retains a TanStack compatibility lint warning; React Compiler is not enabled. The current browser matrix uses Chromium, not Safari/Firefox or physical devices. Performance under production load and AI provider failures was not measured.
