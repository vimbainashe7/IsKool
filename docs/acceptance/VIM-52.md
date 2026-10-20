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

Fresh replay and restricted-role checks passed locally and in CI through `20261020090000_authorized_class_context.sql`; Prisma reports no drift. The additive migration was applied atomically only to approved hosted development after eight checks passed at `5bd4812`, with migration history and maintenance audit recorded. CI verified 21 auth, 3 shared-contract, 29 APS, 103 SAMS, 143 frontend unit and 52 existing browser tests; live tests require the real development environment and are separate from those 52. See PR #8 for the latest live result and current exact-head checks. Do not infer human acceptance or production release from an automated pass.

The Windows launcher now also checks its generated Prisma schema in CI (`npm run prisma:client:check`). Local service-key setup normalizes Windows/Unix line endings and verifies that unmanaged environment values remain unchanged; regression coverage includes adjacent database URLs and passwords. Existing passwords/signing keys remain intact.

Contract and security details: [Internal SAMS API](../contracts/INTERNAL_SAMS_API.md). PR and delivery state: [Product delivery](../progress/PRODUCT_DELIVERY.md).
