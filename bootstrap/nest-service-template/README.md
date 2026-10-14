# Nest Service Template

Reusable backend foundation for `aps-api` and `sams-api`.

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d
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
- APS must not write SAMS-owned data.

## API

All routes are under `/api/v1`.

Swagger: `/api/v1/docs`

Health:

- `/api/v1/health/live`
- `/api/v1/health/ready`

## Environment

Configuration is validated at startup. Production must not use local development secrets.
