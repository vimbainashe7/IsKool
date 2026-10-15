# Backend source import

Source: private `vimbainashe7/APS-SAMS`, commit
`a1c5526a721b6a70efe626bfba4598560769ec0e`.
Destination baseline: `c338add6d1d4320ebb0250590fba9d5049806979`.

This branch copies the 265 tracked source paths from the existing local backend
checkout. It does not merge repository histories. Backend files retain their root
paths; `frontend_base/` remains a separate Node 24 / pnpm application. The root
backend workspace remains Node 22 / npm.

The source `.gitignore` is preserved at `docs/integration/BACKEND_SOURCE.gitignore`;
its generated Prisma exclusion is added to the destination ignore rules. No `.git`,
dependency directories, build outputs, local environment files, keys, credentials,
or session cookie exports are copied from the backend checkout.

The existing local change in `scripts/acceptance/dev-backend.mjs` is preserved:
`shuttingDown` is initialized before `waitForReadiness()` starts. The original
backend checkout is retained without edits.

On 2026-10-14 the owner revised the visibility decision: keep IsKool public and
continue the backend import. Publication of this reviewed source snapshot is
authorized under that instruction. The branch remains local because the CLI
accounts have read-only repository access and the owner's GitHub integration
returns HTTP 403 for Git tree and branch creation. The Git push dry-run likewise
returned permission denied. Repository visibility is not the remaining blocker.

Validation must include both backend `npm run verify` gates and frontend checks
before merging. Live PostgreSQL/RLS and browser login acceptance remain pending:
the configured development database is unreachable, the service configuration
lacks an explicit ISKOOL_ENVIRONMENT, and runtime URLs still use privileged logins.
No authentication or dashboard integration is claimed by this source import.
