# APS API

NestJS backend foundation for the Academic Portal System inside the APS-SAMS monorepo.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:validate
npm run start:dev
```

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm run prisma:validate
npm run start:worker
```

## Architecture Rules

- Controllers call services only.
- Services own business orchestration and transaction boundaries.
- Repositories own persistence.
- Infrastructure SDKs live under `src/infrastructure`.
- Prisma access is not allowed from controllers.
- APS must not write SAMS-owned data; it integrates through the SAMS internal API boundary.

## API

All routes are under `/api/v1`.

Swagger: `/api/v1/docs`

Health:

- `/api/v1/health/live`
- `/api/v1/health/ready`

## Environment

Configuration is validated at startup. Production must not use local development secrets.

`SAMS_INTERNAL_BASE_URL` is required so APS callers do not bypass the SAMS-owned administrative boundary.

The default local database URL points at Supabase local PostgreSQL on port `54322`. Use `npm run supabase:start` from the repository root for PostgreSQL, and `npm run infra:up` for Redis and MinIO. This service does not own separate local infrastructure orchestration.

Supabase Auth is not used by this service.
