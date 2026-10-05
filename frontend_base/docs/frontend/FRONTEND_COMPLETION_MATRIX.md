# Frontend completion matrix

Audit date: 2026-10-04. Linear is unavailable in this session; issue descriptions/statuses cannot be independently verified. Identifiers below come from the supplied execution brief. No ticket has been changed or closed.

## Baseline

Next.js 16.1.1, React 19, pnpm 12.6.0, Node 26.10.0. Working tree initially clean. No AGENTS.md found. `frontend_base` is the only frontend. `aps-api` and `sams-api` are separate backend repositories, containing infrastructure/foundation modules, not complete academic/operations contracts. No frontend unit, integration, E2E or executable RLS suite exists. No configured frontend Supabase environment file.

| Check | Baseline |
| --- | --- |
| lint | PASS |
| typecheck | PASS |
| test | No test script; pnpm returned 0 with no tests. NOT evidence of a pass. |
| build | PASS |
| E2E / RLS | NOT PRESENT |

## Issue requirements

| Issue | Requirement | Current state / implemented? | Tested? | Backend dependency | Files involved | Evidence | Remaining work | Linear status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VIM-69 | Critical flows, route/capability map, role context, all UX states | IN PROGRESS; previous docs omit flow acceptance criteria | No baseline tests | VIM-49,51,52,53,54,55,59,60 | CRITICAL_USER_FLOWS.md, ROUTE_CAPABILITY_MATRIX.md | Repository audit | Ratify full flow specifications and validate routes | Unknown; unchanged |
| VIM-62 | Shared shell, real auth, refresh, context switching, mobile/global states | IN PROGRESS; SSR exists; shell lacks sidebar/profile; role switch ignores failures | Baseline lint/typecheck/build pass | VIM-49,52; deployed Supabase verification | src/components, src/features/context, src/lib/supabase | Repository audit | Complete shell, stop silent sample fallback, verify auth | Unknown; unchanged |
| VIM-63 | Keyboard grid, validation, dirty state, save/reload, mobile, 30/50/100 learners | NOT STARTED; grades page is skeleton | No | VIM-54; transactional versioned save contract | src/features/gradebook | Repository audit | Implement and test frontend and explicit test adapter | Unknown; unchanged |
| VIM-64 | Admin users/classes/enrollment/roles/audit/operations within shared shell | IN PROGRESS; skeleton pages only | No | VIM-49,51,52; trusted audited mutations; finance/HR contracts | src/features/admin | Repository audit | Read adapters, UI workflows, confirmations, precise blockers | Unknown; unchanged |
| VIM-66 | Three tools, persisted job state, draft editing/approval/publish | IN PROGRESS; synchronous mock provider only | No | VIM-60,55,59 | src/features/ai, src/server/ai | Repository audit | Typed job lifecycle, review UI, explicit development adapter | Unknown; unchanged |

## Security blockers discovered

- VIM-49: class SELECT permits every school member; AI drafts/jobs permit every teacher in the school, not the owner. Several child rows lack composite tenant/ownership validation.
- VIM-59: private buckets exist but object SELECT permits all school members. Private bucket alone does not protect students' submissions or unpublished materials. Do not enable production ingestion using these policies.
- VIM-53: assignment schema lacks total marks, late/resubmission policy and atomic submission finalization.
- VIM-54: grades lack revision/uniqueness/atomic bulk save contract.
- VIM-60: backend automation returns generated queue IDs without durable queue insertion; it is not a production AI engine.
- VIM-51/52: student/guardian and admin provisioning/transactional role auditing contracts are absent.

Existing migrations are reviewed as blueprints, not proof of deployed RLS. Frontend adapters must fail safely rather than silently return sample data.

## Final implementation disposition

The table above preserves the pre-change audit. The following supersedes its implementation status; no Linear issue status was changed.

| Issue | Delivered locally | Verification | Production blocker / remaining acceptance |
| --- | --- | --- | --- |
| VIM-69 | Expanded flow acceptance specifications and canonical role/capability routes | Route guards exercised by browser and API tests | Documentation complete locally; Linear acceptance unavailable |
| VIM-62 | Shared responsive shell, verified-session guards, callbacks, recovery, context switching, profile, search, notifications, explicit global states | Auth callback/API tests, browser role denial/switch/logout, viewport checks | Deployed Supabase auth, memberships and RLS verification; VIM-49/52 |
| VIM-63 | Keyboard grid, controlled editor, atomic validated paste, zero/blank distinction, dirty/retry/discard states, version conflicts, server-confirmed save | Component tests at 30/50/100 learners; browser save/reload | VIM-54 versioned transactional bulk grade endpoint; production writes disabled |
| VIM-64 | Admin people/detail, role confirmations, classes/teacher assignment, enrollment, audit; explicit unavailable operational states | Browser role mutation/context/logout; reducer access tests | VIM-49/51/52 audited provisioning, guardians/history, full search/pagination and operations contracts |
| VIM-66 | Three AI tools, source selection, persisted job states, return-to-job, draft editing/review/approval/publication/conversion | Three browser lifecycle tests and reducer tests | VIM-60 durable execution/provider, VIM-55 publication, VIM-59 hardened ingestion; development mock is not production AI |

Student assignments, confirmed uploads, submission status, grades and notes; teacher assignment creation, material drafts/publication and sequential review are implemented against a typed interface. The explicit preview adapter persists real uploaded bytes and records per HTTP-only session ID. Live Supabase reads fail safely; live mutations and file delivery remain unavailable pending the contracts in BACKEND_CONTRACTS.md.

See QA_REPORT.md for final executed results and limitations. Production acceptance is incomplete for VIM-62/63/64/66; do not mark them Done based on development-adapter evidence.

Final verification: lint PASS (one known TanStack warning), typecheck PASS, 49 Vitest tests PASS, nine workflow E2E tests PASS plus one supplementary accessibility E2E PASS, production build PASS, browser bundle secret scan PASS (36 files), production preview-bypass smoke PASS. Responsive checks passed all 54 route/viewport combinations; axe found zero violations across 14 screens. RLS suite NOT RUN because no isolated database was provided. Eighteen final role/viewport screenshots are retained in evidence/.
