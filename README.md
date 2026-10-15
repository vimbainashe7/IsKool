# APS-SAMS

APS-SAMS is the single source repository for the APS academic platform and the SAMS school administration platform.

One repository does not mean one application. APS and SAMS remain separate applications, processes, configuration surfaces, auth boundaries, Swagger documents, workers, and deployment artifacts.

## Repository Layout

```text
apps/
  aps-api/       # imported under VIM-39
  sams-api/      # imported under VIM-42
  web/           # future shared IsKool frontend
packages/
  contracts/     # deliberately shared API/contract types
  config/        # shared lint/TypeScript/test conventions where justified
  design-tokens/ # future frontend tokens
database/
  prisma/        # Prisma ORM mapping, not physical migration authority
supabase/
  migrations/    # canonical physical database migration authority
infra/
  docker-compose.yml
docs/
```

The active topology decision is [ADR-0010](docs/adr/0010-single-repository-monorepo.md). The older separate-repository decision is preserved as superseded history in [ADR-0002](docs/adr/0002-repository-topology.md).

## Prerequisites

- Node.js 22 LTS
- npm
- Git
- Docker Desktop or another Docker runtime when testing Redis queues, MinIO, or the local Supabase stack
- Supabase CLI via `npm ci`

## Quick Start: Local Infrastructure

This workflow is for local development only. Supabase provides the local PostgreSQL database and migration tooling. Redis and MinIO are started from the root compose file.

1. Clone `vimbainashe7/APS-SAMS`.
2. Run `npm ci` from the repository root.
3. Start Supabase local PostgreSQL:
   ```bash
   npm run supabase:start
   ```
4. Start Redis and MinIO:
   ```bash
   npm run infra:up
   ```
5. Check dependency status:
   ```bash
   npm run supabase:status
   npm run infra:ps
   ```
6. Copy each service env example:
   - `apps/sams-api/.env.example` to `apps/sams-api/.env`
   - `apps/aps-api/.env.example` to `apps/aps-api/.env`
7. Run SAMS on port `3002`, then APS on port `3001`.

Supabase Auth is not part of the active authentication architecture. The APIs use Supabase local tooling for PostgreSQL and migrations only.

## Quick Start: Hosted Development Without Docker

The APIs also support an approved non-production Supabase database over its IPv4 session pooler. Set `REDIS_ENABLED=false` in both ignored service `.env` files, configure the three least-privilege database logins described in [Local Development](docs/architecture/LOCAL_DEVELOPMENT.md), then run:

```powershell
npm run acceptance:doctor
npm run dev:backend
```

From a second Node 22 terminal:

```powershell
npm run acceptance:m2
```

This mode covers live database readiness, development seeding, authentication, refresh rotation, logout, authorization, tenant isolation, and audited writes without Docker. Queue workers remain disabled until Redis is enabled.

### Destructive Reset

`npm run supabase:db:reset` runs `supabase db reset`. This is destructive and must be invoked only as an explicit developer action. Do not run database reset during application startup or normal test commands.

## Workspace Commands

Root scripts are intentionally plain npm workspace commands:

```bash
npm run verify
npm run verify:aps
npm run verify:sams

npm run lint
npm run typecheck
npm test
npm run build
npm run prisma:validate
npm run prisma:generate
npm run db:rls:test
npm run db:drift:check

npm run lint:aps
npm run lint:sams
npm run test:aps
npm run test:sams
npm run build:aps
npm run build:sams
npm run doctor
npm run acceptance:doctor
npm run dev:aps
npm run dev:sams
npm run dev:backend
npm run db:inspect:safe
npm run db:provision:remote-dev
npm run db:seed:dev
npm run acceptance:m2
npm run smoke:auth
npm run smoke:authorization
npm run smoke:audit
```

VIM-39 and VIM-42 import the real API packages that these scripts target.

M2 manual acceptance for authentication, authorization, and audit lives in
[docs/acceptance/M2-IDENTITY-AUTHORIZATION.md](docs/acceptance/M2-IDENTITY-AUTHORIZATION.md).
Use Node 22.x; `npm ci` now fails early on unsupported Node versions instead of allowing later TypeScript/Prisma failures.

`npm run db:rls:test` requires a running Supabase local PostgreSQL database rebuilt from committed migrations. `npm run db:drift:check` accepts either that local database or an explicit `DATABASE_URL`, including a linked development session-pooler URL. In CI the local database is handled by the `database-rls` job in the IsKool Architecture Gate.

## CI Architecture Gate

The permanent production gate is `.github/workflows/vim-46-database-rls.yml` under the workflow name `IsKool Architecture Gate`. The filename is preserved from the VIM-46 proof workflow so GitHub can verify the gate on the pull request that promotes it.

Required job names for future branch protection:

- `workspace`
- `aps`
- `sams`
- `database-rls`
- `runtime-smoke`

The template workflow remains intentionally separate and only protects `bootstrap/nest-service-template`. It is not the production application gate.

## Database

The canonical physical database migration history belongs under `supabase/migrations/`. This is required because PostgreSQL RLS, grants, functions, policies, and schema objects must be versioned together.

Prisma remains the typed ORM/query layer. Its schema belongs under `database/prisma/`:

- `database/prisma/schema.prisma`

Do not create competing Prisma migration histories for the same physical database.

APS must not directly mutate SAMS-owned tables simply because local development uses one physical database. APS reaches SAMS-owned data through the authenticated SAMS internal API.

## Ownership Boundary

APS owns academic workflow data: course outlines, assignments, submissions, grade components, grades, notes, question banks, exams, announcements, APS AI job metadata, and academic audit events.

SAMS owns shared identity persistence, roles, student master records, guardians, admissions, enrollments, staff/HR, fee heads, invoices, payments, attendance, leave, timetables, reporting, and SAMS audit events.

## Linear Workflow

Linear is the live progress ledger. Before meaningful work on an issue, move it to In Progress and leave an implementation-start comment. After verified completion, push the code, leave evidence, and mark the issue Done.

`main` is the only long-lived integrated branch. Short-lived Linear-linked branches are acceptable for review, then they must merge back to `main`.
