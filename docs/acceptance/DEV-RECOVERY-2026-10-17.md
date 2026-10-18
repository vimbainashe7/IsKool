# IsKool developer recovery evidence — 2026-10-17

Owner human acceptance remains **pending**. Evidence is retained in PR #5; the owner requested that Linear not be updated during this session.

## Canonical checkout and preservation

Use `C:\Users\User\Documents\aiDo\IsKool_unified`. The former frontend-only checkout was on `chore/windows-local-integration` at `ed1868cb`; the backend import was on `feat/iskool-backend-auth-bff` at `1bef374`. Neither was the merged remote default. The real default is `frontend/workspace-redesigns-2026-10-13`, inspected at `2a270cfabc8150bc14aa0805f7b8c62bcb368eb6`.

Local changes were stashed, reapplied to the focused recovery branch, and left intact. The preservation stash remains available. Existing screenshots and integration notes are excluded from this PR. Ignored developer environment files were preserved; missing backend env files were copied only to ignored destinations. No reset, force-pull, hosted migration, provisioning or seeding was performed.

## Implemented behavior

- Root `npm run dev:iskool` independently selects backend Node 22 and frontend Node 24, validates generated Prisma and non-production least-privilege database connections, detects port owners, and starts or reuses compatible healthy services. Separate `dev:backend` and `dev:frontend` entries remain available.
- Development account buttons fill only the existing fixture email and a password entered manually into the mounted page. They never submit, authenticate, create users or assign roles. Server guards require explicit opt-in, development, trusted loopback execution and a local request host. Production hides the controls.
- Backend authentication, HttpOnly cookies, RLS and school membership remain authoritative. Academic dashboard projections are future domain work.
- Hosted refresh transactions have a bounded development-only allowance; production transaction defaults remain unchanged. Local BFF requests have a bounded development-only timeout for hosted latency.

## Verification record

- Backend Prisma validate/generate, lint, typecheck, tests and builds passed. Tests comprise shared auth 18, APS 19, SAMS 26 and five new development transaction-budget tests.
- Frontend: 112 tests across 14 files passed; typecheck, production build and browser bundle secret scan passed; lint passed with one existing TanStack Table compiler warning. A real production server hid quick-fill and returned 404 for local status despite explicit developer flags.
- Windows process tests: both passed, including an actual foreign port listener that survived conflict diagnosis and rejection of loopback hostname overrides.
- Hosted auth smoke passed: wrong password, real login/context, scope isolation, refresh rotation/replay rejection, logout invalidation and multi-school selection/isolation. Authorization and audit smoke passed.
- All eight GitHub checks passed at `736920768ca177824fa8fec21a173f5f2f2ebd30`; final evidence-commit checks are recorded in the PR.
- Final live Playwright run: **6 passed (4.7m)** against the hosted development database. Student, Teacher and Admin each passed real login, School Alpha membership, live workspace, HttpOnly cookies, reload, identity and logout/protected-route checks. An actually expired signed student access token refreshed and rotated its refresh cookie. Wrong passwords, unauthorized Admin/Teacher links, a real School Beta selection and demo login were rejected.
- Headed interactive checks passed for Student and Teacher; the final Admin check independently confirmed Admin Alpha, School Alpha, reload persistence and protected-route rejection after logout. Screenshots: [Student](evidence/dev-recovery-2026-10-17/student.png), [Teacher](evidence/dev-recovery-2026-10-17/teacher.png), [Admin](evidence/dev-recovery-2026-10-17/admin.png), [desktop sign-in](evidence/dev-recovery-2026-10-17/sign-in.png), [mobile sign-in](evidence/dev-recovery-2026-10-17/sign-in-mobile.png).
- Configured-private-value scan passed across 639 source/staged/browser assets. Live traces were disabled. Browser JavaScript bundle scans found no configured database passwords, private keys or developer password.

The first final rerun failed because five-second readiness probes stopped the launcher's own slow frontend during Chromium startup. The corrected launcher allows bounded local probe latency and prevents overlapping probes. The subsequent complete six-case run passed without service termination. A separate stale-head check correctly refused reuse after a commit changed HEAD; no process was terminated by that check.

## Sensitive artifact incident

A failed Playwright report captured the private development seed password in its accessibility context. Inspecting that report exposed it in this session's tool output. It was never committed. Generated local text artifacts were scrubbed and the old HTML report replaced. Live tests now disable traces, clear password inputs before teardown, and run a tested redaction reporter before standard reporters serialize results. The owner should rotate this development fixture password before sharing it more broadly; no account password was changed automatically.

## Remaining limitations

The laptop has 8 GB RAM; cold compilation can take minutes and tests/builds should run with the development stack stopped. Existing dependency audit findings remain (37: one critical, 29 high, seven moderate); dependencies were not upgraded blindly in this focused recovery. Live authentication does not implement academic projection APIs. The owner still needs to repeat Student, Teacher and Admin sign-in, refresh and sign-out from the canonical checkout.
