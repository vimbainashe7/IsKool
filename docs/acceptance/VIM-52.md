# VIM-52 — authorized class context

Depends on merged VIM-51 student/enrollment records and VIM-38 internal read boundary. Implementation is in [PR #8](https://github.com/vimbainashe7/IsKool/pull/8); human acceptance, merge and release remain pending. Current exact-head CI and live browser evidence are recorded on that PR.

## Owner walkthrough

From the canonical Windows checkout, preserve existing configuration and passwords. Once the reviewed additive migration has been applied to approved development, with services stopped:

```powershell
cd C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:internal:setup
npm run dev:iskool
```

Open http://127.0.0.1:3000/sign-in. Read the existing local credential with `notepad .\Passwords.txt`; no password rotation or reseed is needed.

1. Admin → Students: create/open an active student; link the correct existing Student sign-in account. Save and reload to confirm the association.
2. Create/select a current academic year, current term and class; enroll that student.
3. Admin → Classes → Teaching assignments: select the class and an active Teacher account; assign. Reload, select the class again and verify the assignment remains.
4. Sign out; sign in as that Student → Classes. Open the class and reload. The linked student identity and current enrolled class must remain visible.
5. Sign out; sign in as that Teacher → Classes. Open and reload the class; verify its active student count.
6. Admin revokes the teaching assignment. Teacher reload must remove that class; its detail URL must reject access. Restore the assignment and confirm access returns.
7. Confirm a different class/school/user cannot access the record. Students and Teachers must not be able to link accounts or assign teaching rights.

Each mutation has validation, understandable feedback and a transaction-bound audit. This workflow changes access; choose identities carefully. Revocation retains history. Assignment, submission, grades, timetable and dashboard academic projections remain separate milestones.

## Verification

- `npm run typecheck` — packages and both APIs.
- Frontend Node 24: `pnpm typecheck`, `pnpm test`.
- `npm test` — shared package and API suites, one worker per suite.
- Disposable PostgreSQL: replay every canonical migration; set `MASTER_DATA_TEST_URL` to that disposable database and run `npm run db:master-data:test`; set `DATABASE_URL` to the same disposable database and run `npm run db:drift:check`.
- `npm run smoke:vim-52` — one Playwright worker, real browser/API/approved development database; traces off, redacted reporter. Creates synthetic editable records and retains them for review. Do not use production credentials.

Fresh replay and restricted-role checks passed locally and in CI through `20261020090000_authorized_class_context.sql`; Prisma reports no drift. The additive migration was applied atomically only to approved hosted development after eight checks passed at `5bd4812`, with migration history and maintenance audit recorded. CI verified 21 auth, 4 shared-contract, 29 APS, 108 SAMS, 148 frontend unit and 52 existing browser tests; live tests require the real development environment and are separate from those 52. See PR #8 for the latest live result and current exact-head checks. Do not infer human acceptance or production release from an automated pass.

The Windows launcher now also checks its generated Prisma schema in CI (`npm run prisma:client:check`). Local service-key setup normalizes Windows/Unix line endings and verifies that unmanaged environment values remain unchanged; regression coverage includes adjacent database URLs and passwords. Existing passwords/signing keys remain intact.

The query-contract suite additionally verifies the omitted page-size default (25), invalid limits and tenant-filter injection. Private-listener HTTP coverage verifies the same default after Nest transformation. These regressions were added after live testing exposed response-only transformer decorators overwriting the request default; the shared-contract suite now has four tests.

Live QA also exposed pool-acquisition failures: a six-read page burst reproduced three `P2028` failures at the existing two-second acquisition limit. School Classes now reuses its loaded calendar for setup, and the chooser joins class/year in one query. Pool-busy responses are safe 503s; the browser boundary retries GET once within the original overall deadline, never mutations. Connection limits and transaction timeouts were not raised. The committed regression tests cover bootstrap reuse, bounded read retries and mutation non-retry; final live/CI evidence remains on PR #8.

The same protection applies to SAMS principal-scoped transactions used by existing student/calendar reads. Calendar setup now returns its bounded 100-record arrays and existing UTC ISO wire values from one SQL snapshot. Client cleanup cancels obsolete reads, including development Strict Mode duplicates, and the BFF forwards cancellation upstream. Local verification after this change: all 108 SAMS tests and 18 affected frontend tests passed, with lint/typecheck clean. All eight CI checks passed at application head `d51baaf7afcbb73f9bd32b253b1927fd839881ee` (108 SAMS / 148 frontend unit tests). The reduced four-request page burst passed 4/4 with the existing three runtime connections and unchanged transaction limits. Final live acceptance and subsequent documentation-head CI are recorded on PR #8; owner acceptance is pending.

Contract and security details: [Internal SAMS API](../contracts/INTERNAL_SAMS_API.md). PR and delivery state: [Product delivery](../progress/PRODUCT_DELIVERY.md).
