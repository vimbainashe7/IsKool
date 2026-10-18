# IsKool product delivery

Updated: 2026-10-18 (Africa/Harare).

## Current capability and gate

| Issue | Capability | Dependencies | Implementation | Frontend | Migrations | Verification | GitHub | Human acceptance | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VIM-70 | Reproducible Windows development and real three-role authentication | Existing identity/RLS foundation | PR #5 merged; credential incident remediated in development | Existing live sign-in, dashboards, reload and logout | None in this follow-up | Exact PR head: eight successful checks; local env tests 3/3; redaction regression 1/1; configured-value scan 639 files/assets; post-rotation live browser 6/6 (4.3m); API auth, authorization and audit smoke passed | PR #5 head `95124bcbd96caa7498c116a621d81766523ad806`; merge `5b09fcebadafb98ad2132bc49a6073b95f73ba9c` at 2026-10-18 04:53:07 UTC; no review threads | Owner explicitly accepted Student, Teacher and Admin in this conversation on 2026-10-18; post-rotation automated acceptance passed | Gate closed; inherited dependency vulnerabilities remain release blockers pending triage |
| VIM-51 / VIM-52 (exact Linear scope unverified) | Student, guardian and enrollment administration | VIM-70 gate closed; canonical schema and restricted-role tests | In progress; schema inspection completed; no usable CRUD yet | Existing student administration screen; no real domain mutations | None generated/applied | No CRUD demonstration yet | No domain PR | Pending future implementation | Linear plugin not installed/connected; actual issue requirements not retrieved |

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

Backend implemented, frontend integrated, CI verified, human accepted and released are independent statuses. PR #5 merging does not establish domain CRUD or launch readiness. No Linear transition has been performed; no new Linear issue has been created. Existing user screenshots, `.gitignore` changes and untracked integration notes remain untouched.

## Gate verification commands (2026-10-18)

- `node --test scripts/acceptance/local-env.test.mjs`: 3 passed.
- In `frontend_base`: `node node_modules/vitest/vitest.mjs run tests/live-auth-redaction.test.ts --maxWorkers=1`: 1 passed.
- `node scripts/acceptance/check-secrets.mjs`: 639 tracked/staged/browser assets passed.
- `npm run dev:iskool`: PASS LIVE; independent Node 22/24; reused unchanged backend build.
- Node 22 `scripts/acceptance/m2-auth.mjs`, `m2-security.mjs`, `m2-audit.mjs`: passed against development PostgreSQL and restricted runtime roles.
- Ignored `tmp/run-delivery-live-auth.mjs` loads the rotated credential in the Node process and runs `playwright test tests/e2e/live-auth.spec.ts --workers=1` with live auth/port 3000: 6 passed (4.3m).
- Verified checksum of official Gitleaks 8.30.1 Windows archive; `gitleaks git . --log-opts=--all --redact=100`: 40 reachable commits / 3.96 MB; two findings were literal private-key replacement instructions in `.env.example`, not key material. Exact fingerprints in `.gitleaksignore`; rerun: no leaks. This does not attest to unreachable remote objects or secrets outside the repository.
