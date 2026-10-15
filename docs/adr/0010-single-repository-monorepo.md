# ADR-0010: Single Repository Monorepo

Status: Accepted

Date: 2026-09-19

Supersedes: [ADR-0002: Repository Topology](0002-repository-topology.md)

Note: The repository topology remains accepted. The local database details in this ADR were superseded by the VIM-44 Supabase/PostgreSQL local infrastructure work: Supabase CLI owns local PostgreSQL, `supabase/migrations/` is the physical migration authority, and the root compose file owns Redis and MinIO only.

## Context

APS and SAMS development is now moving as one coordinated platform. The earlier separate-repository plan created unnecessary sync and remoting friction between the APS API, SAMS API, shared contracts, local infrastructure, and upcoming frontend integration work.

Frontend teams will integrate shortly and need one checkout that exposes the application boundaries, contract locations, and local startup path clearly. Local development also needs a single orchestration point for shared infrastructure while preserving APS/SAMS process boundaries.

CI and full-stack testing are easier to reason about when the integrated source state lives in one branch. Atomic changes to shared contracts, infrastructure, database migration policy, and application code can be reviewed together instead of relying on coordinated commits across several remotes.

## Decision

Use one GitHub monorepo:

```text
vimbainashe7/APS-SAMS
```

`main` is the integrated source of truth. APS and SAMS applications live under `apps/`:

```text
APS-SAMS/
|-- apps/
|   |-- aps-api/
|   |-- sams-api/
|   `-- web/
|-- packages/
|   |-- contracts/
|   |-- config/
|   `-- design-tokens/
|-- database/
|   `-- prisma/
|       `-- schema.prisma
|-- supabase/
|   `-- migrations/
|-- infra/
|   `-- docker-compose.yml
|-- docs/
`-- .github/workflows/
```

Use npm workspaces from the repository root. Do not introduce pnpm, Yarn, Turborepo, or a separate monorepo orchestrator unless a specific technical blocker is documented.

APS and SAMS remain separate NestJS applications. They keep separate bootstraps, app modules, environment contracts, Swagger documents, health checks, workers, request pipelines, JWT settings, build artifacts, and deployable runtime processes.

## Consequences

Benefits:

- one clone for contributors;
- one CI surface for architecture gates;
- easier local orchestration for Supabase PostgreSQL, Redis, and MinIO;
- simpler frontend/backend contract integration;
- atomic contract, infrastructure, and schema policy changes;
- easier local full-stack startup from one checkout.

Costs:

- larger repository;
- CI needs path awareness;
- module boundaries must be enforced intentionally;
- shared packages can become coupling vectors if abused;
- consolidation commits must preserve evidence from the earlier local APS/SAMS repositories.

## Non-Negotiable Rule

Repository consolidation does not grant APS permission to import, query, or mutate SAMS domain internals directly.

APS remains authoritative for academic workflow data. SAMS remains authoritative for shared identity, student master data, enrollment, staff/HR, fees, attendance, timetable, reporting, and SAMS audit data. APS consumes SAMS-owned capabilities through the authenticated typed SAMS internal API, not by reaching into SAMS modules or tables because they happen to live in the same repository or local database.

Shared packages are limited to deliberately cross-cutting contracts, configuration, and future design tokens. They must not become a hidden `core` package containing APS and SAMS business logic.

## Migration / Follow-Up

- Import the existing local APS API work into `apps/aps-api` under VIM-39.
- Import the existing local SAMS API work into `apps/sams-api` under VIM-42.
- Keep frontend application directories reserved for future frontend Linear issues; do not generate placeholder apps just to fill the tree.
- Establish the canonical physical database migration history under `supabase/migrations/` under VIM-46.
- Keep Prisma schema mapping under `database/prisma/` without creating a competing migration authority.
