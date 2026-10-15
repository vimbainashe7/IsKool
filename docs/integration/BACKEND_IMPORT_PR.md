APS/SAMS currently lives in a separate checkout from the frontend. This change
imports its tracked source into the IsKool repository root while retaining
`frontend_base/` and its separate Node 24 / pnpm runtime. The backend retains
Node 22 / npm, its canonical Prisma schema, Supabase migrations, auth package,
service authorization, audit implementation, RLS helpers, acceptance scripts,
and CI architecture gate.

Source provenance: `vimbainashe7/APS-SAMS` at
`a1c5526a721b6a70efe626bfba4598560769ec0e`, plus the existing local
`dev-backend.mjs` initialization-order fix. All 265 copied source files matched
the preserved checkout byte for byte. Backend Git history is not merged. Local
environments, private keys, dependencies, build output, and credentials are
excluded. The inherited frontend cookie export is removed.

The owner explicitly approved keeping the destination public and continuing this
reviewed source import. A scan of 781 tracked paths, including Word XML, found no
private keys, provider secrets, static JWTs, or nonlocal database passwords.

Validation: Node 22 `npm ci` and `npm run verify` passed. Prisma generation and
validation, auth package checks, both service lint/typecheck gates, all 53 tests
across 11 suites, and all builds passed. Dependencies remain lockfile-pinned and
unchanged; npm reported 37 inherited audit findings.

The frontend source and repair commits are the same as the focused frontend PR.
Keep this PR stacked on `fix/deterministic-workspace-testing` until that repair is
merged, then target the destination default branch. This keeps frontend repair
and backend source import separate for review.

This import does not migrate browser authentication or implement dashboard read
projections. Live PostgreSQL/RLS and browser-login acceptance remain blocked by
the unreachable configured development database and pending non-production,
least-privilege runtime connection configuration. No domain issue is closed by
this import. GitHub publication currently requires restored repository write access.
