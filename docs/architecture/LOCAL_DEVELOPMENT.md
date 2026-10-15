# Local Development

APS-SAMS supports two development database modes:

- Supabase local PostgreSQL for database development and migration tooling.
- A linked, non-production Supabase project through the IPv4 session pooler.

Redis and MinIO are Docker-managed when their features are being exercised. The APIs can run without Docker for authentication, authorization, audit, and database acceptance by setting `REDIS_ENABLED=false`. Queue workers are unavailable in that mode. Current API routes do not require MinIO during startup.

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

## Hosted Development Without Docker

Use Node 22 and connect only to a project whose `ISKOOL_ENVIRONMENT` is `development`, `staging`, or `testing`.

1. Authenticate and link the Supabase CLI:
   ```powershell
   .\node_modules\.bin\supabase.cmd login
   .\node_modules\.bin\supabase.cmd link --project-ref <development-project-ref>
   ```
2. Put the session-pooler URLs and generated development login passwords in the ignored root and service `.env` files. Use separate `iskool_aps_dev_login`, `iskool_sams_dev_login`, and `iskool_auth_dev_login` credentials. Set `REDIS_ENABLED=false` in both service files.
3. Provision or rotate those least-privilege logins, inspect the database, and start the APIs:
   ```powershell
   npm run db:provision:remote-dev
   npm run db:inspect:safe
   npm run dev:backend
   ```
4. In a second Node 22 terminal, run the live acceptance suite:
   ```powershell
   npm run acceptance:m2
   ```

Successful readiness reports `database=ok` and `redis=disabled` for both services. The seed and provisioning commands refuse production configuration and require their explicit `ALLOW_*` switches.

## Dependency Ownership

Supabase CLI owns local PostgreSQL. A linked Supabase project owns hosted development PostgreSQL. The root Docker compose file owns optional local Redis, MinIO, and APS/SAMS buckets. Production configuration must keep Redis enabled.

The root compose file is the only local infrastructure orchestration file. API workspaces keep service-specific runtime configuration but do not carry separate local dependency stacks.
