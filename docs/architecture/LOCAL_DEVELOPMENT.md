# Local Development

APS-SAMS supports one local database mode:

- Supabase local PostgreSQL for database development and migration tooling.

Redis and MinIO are Docker-managed dependencies. Exact compose commands live in `infra/README.md` and must match `infra/docker-compose.yml`.

## Default Ports

- APS API: `3001`
- SAMS API: `3002`
- Redis: `6379`
- MinIO API: `9000`
- MinIO console: `9001`
- Supabase PostgreSQL: `54322`
- Supabase API: `54321`

All ports are defaults and must remain configurable through service environment files.

## Local Infrastructure

This is local development only.

1. Run `npm ci`.
2. Start Supabase local PostgreSQL with `npm run supabase:start`.
3. Start Redis, MinIO, and the local buckets with `npm run infra:up`.
4. Confirm dependencies with `npm run supabase:status` and `npm run infra:ps`.
5. Configure both APIs with the Supabase local database URL from `supabase status`.
6. Start `sams-api`, then `aps-api`.

`npm run supabase:db:reset` is destructive and must never run automatically at application startup.

## Dependency Ownership

Supabase CLI owns local PostgreSQL. The root Docker compose file owns Redis, MinIO, and local APS/SAMS buckets. Application code is the same between local and production configuration; only environment values change.

The root compose file is the only local infrastructure orchestration file. API workspaces keep service-specific runtime configuration but do not carry separate local dependency stacks.
