# Infrastructure

Root infrastructure will orchestrate local dependencies shared by APS and SAMS.

Target services:

- Redis
- MinIO

Supabase CLI owns local PostgreSQL. This compose file must not start a second database container.

## Commands

Start Redis and MinIO:

```bash
npm run infra:up
```

Check service status:

```bash
npm run infra:ps
```

Validate the compose file without starting containers:

```bash
npm run infra:config
```

MinIO creates the local APS and SAMS buckets defined by `APS_STORAGE_BUCKET` and `SAMS_STORAGE_BUCKET` through `MINIO_DEFAULT_BUCKETS`.

The root compose file is the only local Redis/MinIO orchestration file. Individual API workspaces own runtime code and service-specific `.env.example` files, not separate dependency compose stacks.

Do not commit real secrets. Compose defaults must come from environment values or safe local-only defaults.
