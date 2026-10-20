# IsKool product delivery

Updated: 2026-10-20 (Africa/Harare).

## Current delivery

Owner accepted the revised Settings workflow and explicitly approved merging PR #6 followed by PR #7 on 2026-10-20. Acceptance evidence is recorded on both PRs. VIM-70's three-role human acceptance remains closed.

PR #6 merged into the configured default branch `frontend/workspace-redesigns-2026-10-13` as `81c7c155a05a3fa2d8f8d3b2e75cb36b43314c44`. Its head `81b42e3` had eight passing checks and no unresolved review discussions. Student/guardian/enrollment administration and real Admin counts are implemented, integrated and human accepted. Production release is separate.

PR #7 merged as `4b58639d17ba2c97e9041313948c7d77a778468c` after all eight checks passed at integrated head `633484c`. Owner explicitly accepted and approved both merges. School identity, own Admin display name and canonical logo persist through one Save changes and a green toast. SAMS 86 tests, APS 19, frontend 138 unit / 52 browser tests; complete live Settings journey passed in 5.8 minutes. PostgreSQL verified persisted versions and paired audits; local launcher/credential-file handoff passed. VIM-71 is Done in Linear; production release remains separate.

Linear reconnected on 2026-10-20; VIM-51 and VIM-71 are Done after owner acceptance and the two approved merges. VIM-52 is In Progress in [PR #8](https://github.com/vimbainashe7/IsKool/pull/8), branch `feat/vim-52-authorized-class-context`: student/account linking, versioned teacher/class assignments, protected internal reads, a typed APS client and real Student/Teacher Classes views. Migration `20261020090000` replayed on fresh disposable PostgreSQL, passed restricted-role isolation/revocation and Prisma drift, then applied atomically to approved hosted development after eight exact-head checks passed at `5bd4812`. No production migration or password rotation occurred. Current live and exact-head CI evidence is maintained on PR #8; human acceptance, merge and release remain separate gates. Broader academic/finance/file capabilities are not Done. Inherited dependency advisories remain launch blockers.

Identity migrations and scoped runtime security details: `docs/contracts/SCHOOL_IDENTITY_SETTINGS.md`. Owner walkthrough: `docs/acceptance/VIM-71.md`. Earlier integration/debug evidence remains traceable in PR #7 and Git history.

## Current capability and gate

| Issue | Capability | Dependencies | Implementation | Frontend | Migrations | Verification | GitHub | Human acceptance | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VIM-52 | Authorized Student/Teacher class context via APS → SAMS | VIM-38, VIM-51, VIM-71 | Implemented; Linear In Progress; no APS domain table grants | Admin account-link and teaching-assignment controls; real Student/Teacher Classes list/detail | Additive `20261020090000`: account FK/uniqueness, versioned `class_teachers`, tenant indexes and scoped forced RLS | CI auth 21 / contracts 4 / APS 29 / SAMS 108 / frontend 148; fresh SQL, disabled identities and no drift passed; latest live/CI evidence on PR #8 | [PR #8](https://github.com/vimbainashe7/IsKool/pull/8), focused branch | Pending; PR #6/#7 approvals do not extend here | Owner gate; not released; dashboards and academic work remain separate |
| VIM-70 | Reproducible Windows development and real three-role authentication | Existing identity/RLS foundation | PR #5 merged; credential incident remediated in development | Existing live sign-in, dashboards, reload and logout | None in this follow-up | Exact PR head: eight successful checks; local env tests 3/3; redaction regression 1/1; configured-value scan 639 files/assets; post-rotation live browser 6/6 (4.3m); API auth, authorization and audit smoke passed | PR #5 head `95124bcbd96caa7498c116a621d81766523ad806`; merge `5b09fcebadafb98ad2132bc49a6073b95f73ba9c` at 2026-10-18 04:53:07 UTC; no review threads | Owner explicitly accepted Student, Teacher and Admin in this conversation on 2026-10-18; post-rotation automated acceptance passed | Gate closed; inherited dependency vulnerabilities remain release blockers pending triage |
| VIM-51 (VIM-52 next) | Student, guardian and enrollment administration | VIM-70 closed; SAMS calendar/class ownership | Backend implemented; live Admin CRUD human accepted; merged, not production released | Existing Admin list/detail design integrated with SAMS; desktop/mobile verified | Two additive migrations, `20261018060000` and `20261018061000`, replayed on disposable PostgreSQL and applied only to approved hosted development | 39 new SAMS tests; 10 frontend contract/boundary tests; 5 auth-outage regressions; restricted-role SQL and Prisma drift passed; live CRUD passed (4.0m); live isolation passed; post-fix affected auth cases passed (3/3) after dependency failures | [PR #6](https://github.com/vimbainashe7/IsKool/pull/6), head `81b42e3`, eight checks passed; merge `81c7c15` | Owner accepted and approved merge on 2026-10-20 | Linear restored; VIM-51 Done; intermittent hosted dependency latency; remaining release security work |
| VIM-71 | School identity and own Admin profile | VIM-51 integrated | Implemented, merged, Linear Done | One Save changes, green toast, shared branding across roles | Three forward identity/RLS migrations | Eight checks at integrated `633484c`; live journey 1 passed; PostgreSQL audits/persistence verified | PR #7, merge `4b58639` | Owner accepted and approved on 2026-10-20 | Not production released; broader domain routing is separate |

## Credential incident remediation

Confirmed non-production target from existing configuration and exact expected fixture identities. Rotated only the seven acceptance fixture password verifiers using Argon2id in one transaction; updated password-change timestamps; revoked 20 active sessions and 50 refresh tokens; consumed three pending login continuations. One maintenance event was appended to `audit_events`. Memberships, roles and user lifecycle states were preserved. All seven stored verifiers reject the old password and accept the generated replacement. Ignored local SAMS/APS environment files were updated; no password is recorded here. Password recovery handoff is in ignored `tmp/local-dev/fixture-rotation.env`; do not publish it.

The sandboxed redaction regression initially failed to start its worker (zero tests executed). The unrestricted rerun with one worker passed. This is separate from application behavior.

## Schema delta at merged PR #5

Canonical authority: `supabase/migrations/` (five migrations) and `database/prisma/schema.prisma`. Do not execute the archived frontend schema as a second authority.

| Target concept | Actual canonical model | Missing capability |
| --- | --- | --- |
| schools | `School` / `schools` | School operations configuration |
| users | `User` / `users` | Student/staff identity associations |
| memberships | `Membership` / `memberships` | Keep server-verified school and active membership context |
| membership_roles | `MembershipRole` / `membership_roles`, `Role` / `roles` | No duplicate role structures needed |
| students | Absent | School-owned student identity/master record, private details and lifecycle |
| guardians | Absent | School-scoped guardian identity/contact records |
| student_guardians | Absent | Authorized many-to-many relationship |
| teachers | Absent | Teacher master identity and class assignments |
| staff | Absent | Staff profile/lifecycle |
| classes | Absent | School-owned class/section and teacher assignments |
| enrollments | Absent | Student/class/period FKs, active uniqueness, historical lifecycle |
| academic_years | Absent | School calendar and date consistency |
| academic_terms | Absent | Year-owned school calendar periods |

SAMS owns administrative classes/sections, academic years/terms and enrollment eligibility as master data. APS owns assignment/submission/grade workflows and consumes authorized SAMS read contracts; it must not mutate these SAMS records. This boundary follows the existing data-ownership and enrollment documents and must be reflected in the first domain migration/contract review.

Minimum complete next slice: admin/registrar creates a student, links an authorized guardian, enrolls into a valid school class/term, lists and opens details, edits an allowed field, reloads and verifies persistence, then performs a permitted enrollment transition. Teacher/student mutations and foreign-school references must fail. Each mutation and its audit record share a transaction. Calendar/class setup must have a usable authorized path rather than fixture-only IDs.

## Human test

From PowerShell:

```powershell
Set-Location C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:iskool
```

Open `http://127.0.0.1:3000/sign-in`. Use the local rotated development credential, then test Student, Teacher and Admin individually: sign in, navigate, reload and verify the same role/school, sign out, and confirm the protected dashboard returns to sign-in. Credentials are never committed or copied into reports.

## Delivery state distinctions

Backend implemented, frontend integrated, CI verified, human accepted and released are independent statuses. PR #5 merging does not establish domain CRUD or launch readiness. Initially Linear was unavailable; reconciliation is recorded below. No duplicate Linear issue has been created. Existing user screenshots, `.gitignore` changes and untracked integration notes remain untouched.

## Gate verification commands (2026-10-18)

- `node --test scripts/acceptance/local-env.test.mjs`: 3 passed.
- In `frontend_base`: `node node_modules/vitest/vitest.mjs run tests/live-auth-redaction.test.ts --maxWorkers=1`: 1 passed.
- `node scripts/acceptance/check-secrets.mjs`: 639 tracked/staged/browser assets passed.
- `npm run dev:iskool`: PASS LIVE; independent Node 22/24; reused unchanged backend build.
- Node 22 `scripts/acceptance/m2-auth.mjs`, `m2-security.mjs`, `m2-audit.mjs`: passed against development PostgreSQL and restricted runtime roles.
- Ignored `tmp/run-delivery-live-auth.mjs` loads the rotated credential in the Node process and runs `playwright test tests/e2e/live-auth.spec.ts --workers=1` with live auth/port 3000: 6 passed (4.3m).
- Verified checksum of official Gitleaks 8.30.1 Windows archive; `gitleaks git . --log-opts=--all --redact=100`: 40 reachable commits / 3.96 MB; two findings were literal private-key replacement instructions in `.env.example`, not key material. Exact fingerprints in `.gitleaksignore`; rerun: no leaks. This does not attest to unreachable remote objects or secrets outside the repository.

Initial frontend fork workers timed out before tests ran under memory pressure. With other compilers finished, the same 10 tests passed using `--pool=threads --maxWorkers=1` (190.73s total, mostly setup/startup). No test assertions were weakened. The updated six-migration replay and restricted-role suite also passed on a second disposable native PostgreSQL database.

Security review added forward-only migration `20261018061000_sams_master_data_privileges.sql` to remove inherited/provider grants (including TRUNCATE) and regrant only intended SAMS operations. Seven migrations replayed under deliberately broad provider defaults on a fresh disposable PostgreSQL database: all seven new tables force RLS, restricted-role checks pass, provider service-role SELECT is denied, and no SAMS TRUNCATE/DELETE/tenant-column UPDATE privilege remains. First PR #6 CI head `de7a23d` had 7 successful checks and a fixture namespace collision in `database-rls`; fixture IDs were separated without deleting prior suites' data. Final-head CI remains pending.

The real Windows launcher exposed a Prisma-schema comparison false positive on punctuation spacing in new valid models. A failing regression demonstrated it; the token comparison now preserves quoted defaults and identifier boundaries while ignoring punctuation spacing. All four `local-env.test.mjs` tests pass, and the actual generated/canonical schemas compare equal. Owner is clearing a pre-existing frontend terminal on port 3000; no unrelated process was terminated.

Hosted development verification: all eight checks passed at f452daa; both additive migrations applied atomically with history and a maintenance audit event. Prisma drift matches and seven tables force RLS. First live CRUD attempt was interrupted before student creation by dependency timeouts and launcher shutdown. Launcher monitoring now distinguishes verified API liveness from database readiness, loudly reports DEGRADED, retries readiness, and still stops a non-live service. Initial readiness remains required; production timeouts are unchanged. Six local launcher regression tests pass. Live CRUD rerun is pending.

## Verified Admin capability (2026-10-18)

The real browser created a year, term, class, student and guardian, linked the guardian, enrolled the student, reloaded, edited the given name, reloaded, withdrew the enrollment and reloaded again. Invalid terminal revival returned 422; a stale student version returned 409. A separate live test proved Alpha Admin cannot read/update the Beta student (404), and Teacher/Student cannot perform privileged student reads/writes (401). Desktop and 390px mobile screenshots were inspected; no horizontal overflow. The record breadcrumb uses ?Student record?, not a database identifier.

Read-only PostgreSQL verification independently confirmed student version 2 and edited name, guardian relationship, withdrawn enrollment version 2 with server timestamp, and all six required mutation audit actions. All seven new tables force RLS. Evidence is private/ignored under `tmp/local-dev/student-crud-evidence/`; no credentials or sensitive browser reports are committed.

Commands and outcomes:

- Node 22 `npm run test:sams`: CI 70 passed (39 new); `npm run test:aps`: CI 19 passed.
- Frontend `node node_modules/vitest/vitest.mjs run tests/student-contracts.test.ts tests/student-api-boundary.test.ts --pool=threads --maxWorkers=1`: 10 passed.
- Frontend `node node_modules/vitest/vitest.mjs run tests/auth-outage.test.ts --pool=threads --maxWorkers=1`: initially 4 failed / 1 passed, then all 5 passed after the fix. Context outages do not rotate credentials; transient refresh failures preserve cookies and return retryable 503; rejected refresh credentials are still cleared.
- `node --test scripts/acceptance/local-env.test.mjs scripts/acceptance/readiness.test.mjs`: 6 passed. The same command is now `npm run test:dev` and runs in CI.
- `MASTER_DATA_TEST_URL` set privately, then `node scripts/test-sams-master-data.mjs`: actual restricted-login SQL suite passed on a fresh seven-migration database with broad provider default grants; Prisma drift matched. CI independently passed this suite and existing foundation/auth RLS suites.
- Private in-process credential loader ran `playwright test tests/e2e/student-administration.spec.ts --workers=1`: isolation test passed; CRUD initially exceeded a 15s cold-navigation assertion (actual 15.4s), then a dependency outage interrupted login. With the explicit bounded navigation wait and outage fix, `--grep 'Admin creates'` passed (4.0m). No mutation was retried automatically or failure replaced with fixture data.
- Hosted migration runner required eight successful exact-head checks at f452daa before applying the two additive migrations atomically. Hosted `scripts/check-prisma-drift.mjs`: matched; seven forced-RLS tables verified.
- `npm run dev:iskool`: PASS LIVE after rebuilding changed backend once; retry reused the unchanged build. Outage monitoring logged DEGRADED and RECOVERED while preserving verified live APIs. Startup still requires readiness and non-live services still fail.
- Gitleaks `git . --log-opts=--all --redact=100`: 45 reachable commits / 4.09 MB, no leaks with two reviewed exact template fingerprints excluded. Configured-value scan: 666 tracked/staged/browser assets passed before final commit.

Latency investigation found zero blocked database sessions; inspected application connections were idle/ClientRead. Runtime pooler configuration already bounds each client to three connections. Fresh SELECT 1 samples were 2330/233/270ms; an existing context request took 27s, and one UI year-create request took 49s including proxy time. No production transaction timeout was increased. The post-change full live-auth rerun had 3 passes and 3 dependency-related failures (workspace 503, login 502, wrong-password response deadline); affected-case rerun passed all three cases (2.0m), retaining the earlier failed results. These failures are retained separately from successful CRUD evidence.

Owner test for this capability: start `npm run dev:iskool`, open `http://127.0.0.1:3000/sign-in`, choose Admin with the rotated private credential, then Students. Create/select a year, term and class; create a student; open its record; create/link a guardian; enroll; edit a name and reload; withdraw and reload. Confirm success/error feedback and retained enrollment history. Owner already accepted the earlier three-role authentication gate; this new capability has not been human accepted.

Follow-up limitations: registrar mutations are supported by SAMS, while this first interface journey uses the existing Admin workspace. Student account association, teacher/class assignment, larger history/setup browsing, APS internal read contracts and academic projections remain future work. Existing dependency vulnerabilities and production readiness work remain release blockers. Linear later reconnected; see reconciliation below. No issue was duplicated.

## Linear reconciliation and final acceptance tooling

The `vitso` Linear account regained access on 2026-10-18; the other account did not contain VIM issues. Read the actual VIM-51/VIM-52/VIM-70 descriptions, dependencies and acceptance comments. VIM-35/38/46/48 are Done. VIM-70 transitioned In Progress -> Done only after the owner's explicit three-role acceptance and merged PR #5 evidence were recorded in a comment. VIM-51 transitioned Todo -> In Progress and links PR #6; VIM-52 remains Todo and is not implemented in this PR.

VIM-51's existing acceptance comment additionally requires a committed smoke command, manual/API walkthrough, persistence/audit inspection, and negative checks. Added `npm run smoke:vim-51` and `docs/acceptance/VIM-51.md`. The smoke loads private development credentials in-process, verifies running services, uses one real browser worker, creates uniquely named records, applies no migration/seed/delete, and exits nonzero on failure. UI uses Admin; registrar API examples are included. Admissions linkage is not introduced before the admissions domain exists. Efficient enrollment lookup indexes are included; APS active-term read contracts belong to VIM-52.

Post-outage-fix auth evidence: full suite initially 3/6 passed with provider-dependent 502/503/deadline failures; rerunning only the affected Admin, rotating-refresh and wrong-password/role/school cases passed 3/3 (2.0m). Combined case coverage is six successful tests across these runs, not a claimed clean six-case final run. Final visual smoke passed real Admin sign-in, persisted detail, readable breadcrumb, desktop/mobile no-overflow and logout.
## Owner acceptance correction: loopback enrollment failure

Owner reported enrollment from `http://127.0.0.1:3000` failed with "This request could not be verified." This is failed acceptance, not an approved/Done iteration. Reproduced with an intentionally invalid browser mutation at that exact origin: frontend returned 403 before DTO validation/SAMS. The new student BFF used raw request.url origin comparison; Next development normalizes that URL to localhost. Earlier live acceptance used localhost and missed the documented owner address.

Correction reuses the existing tested `isSameOrigin` helper used by sign-in/logout. The localhost/127 alias exception remains limited to explicitly loopback-bound development with deployment/forwarded-host safeguards; production matching is unchanged. No authorization or RLS rule is bypassed. Added a route regression: initially 403 instead of 201; after correction, all 14 route/origin tests passed. Live Playwright acceptance now selects 127.0.0.1 while ordinary CI/demo tests retain localhost. Extended the browser journey to re-enroll after withdrawal, verify a new active row after reload, and retain withdrawn history.

Owner requested a fixed development demo password. Configured only the seven known fixture accounts, updated ignored configuration/access handoff, and verified Student/Teacher/Admin sign-in/reload/logout (3/3, 2.8m). The fixed credential remains stable and is not committed. Existing roles, memberships and school records were preserved.

Latest loopback smoke and final-head CI evidence are attached to PR #6's verification discussion. VIM-51 remains In Progress; owner retest and merge approval are required. Prior localhost success must not be treated as evidence that the original loopback path worked. No merge performed.

## VIM-51 acceptance follow-up: authoritative school overview

Owner created/enrolled a student successfully on 2026-10-19, but Dashboard and Enrollment still showed zero. The live workspace returned empty projection arrays, and the old Admin model inferred student counts from login memberships. Those arrays were unavailable data, not authoritative zero records.

Added SAMS `GET /api/v1/student-administration/summary` and paginated `GET /api/v1/student-administration/enrollments`. Both use existing admin/registrar policy, active membership verification, principal-derived school and restricted runtime RLS. Summary uses a single SQL snapshot; enrolled-student count is distinct active students with active enrollment, while enrollment count measures active rows across all academic terms. Closed and pending enrollments remain history, excluded from active counts. No migration, Prisma mapping, privilege or RLS change.

Dashboard and Enrollment consume the real aggregates; Enrollment displays persisted student/class/term/status rows, with pagination and student detail links. Classes reads existing SAMS academic setup. Unsupported account, teacher assignment, timetable and audit projections show unavailable instead of inferred empty data. Student mutations refresh route data. README documents count meanings, persistence acceptance and retained development test records. Existing domain test records are real database records, editable/archivable through the registry.

Verification results and latest commit/CI are recorded on PR #6. Local frontend suite: 133 passed; targeted SAMS service invariants: 11 passed; backend/frontend typechecks passed before final formatting. Browser verification pending at this checkpoint. VIM-51 remains In Progress; the new overview has not yet been human accepted or merged. Next capability remains VIM-52 APS/SAMS internal context after this PR's acceptance gate.

### VIM-71 acceptance refinement: single Settings save

Owner confirmed the identity/branding workflow worked, then requested one Save instead of three. The interface now batches display name, school name and optional logo changes into one explicit **Save changes**, with a green confirmation only after success. SAMS checks both versions and commits all changes/audits atomically; logo removal is a reversible draft until saved. No new migration or RLS grants. Local settings/audit invariant tests: 12 passed. The first live combined save exposed sensitivity to hosted latency; UPDATE RETURNING and batched audit inserts reduce the transaction from nine database round trips to seven without changing timeouts. Latest CI, live browser and database evidence are recorded on PR #7. Owner accepted the single-save UX and approved merge on 2026-10-20. Integrated-head checks passed and PR #7 merged as `4b58639`.
