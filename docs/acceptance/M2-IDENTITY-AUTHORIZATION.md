# M2 Identity, Authorization, and Audit Acceptance

This guide proves VIM-48, VIM-49, and VIM-50 against the real APS/SAMS HTTP services and a real Supabase/PostgreSQL database.

Do not run destructive database commands for this acceptance path. Do not run `supabase db reset`, `TRUNCATE`, or `DROP` against a shared Supabase project.

## Ports and URLs

- SAMS API: `http://localhost:3002/api/v1`
- APS API: `http://localhost:3001/api/v1`
- SAMS health: `http://localhost:3002/api/v1/health/live`
- APS health: `http://localhost:3001/api/v1/health/live`
- SAMS Swagger: `http://localhost:3002/api/v1/docs`
- APS Swagger: `http://localhost:3001/api/v1/docs`
- Supabase dashboard: `https://supabase.com/dashboard/project/ufwifbvozmmsajmmddmb`
- Supabase Table Editor: `https://supabase.com/dashboard/project/ufwifbvozmmsajmmddmb/editor`
- Supabase Database settings: `https://supabase.com/dashboard/project/ufwifbvozmmsajmmddmb/settings/database`

Use Node 22.x. The repository pins this in `.node-version`, `.nvmrc`, and `package.json`. Node 24 is not supported for this acceptance path.

Run the doctor before smoke tests:

```powershell
npm run acceptance:doctor
```

The doctor reports:

- Node version
- dependency install state
- TypeScript binary
- generated Prisma Client
- APS/SAMS `.env` presence
- database reachability
- APS/SAMS health status

## Configure Environment

Copy the service environment files:

```powershell
Copy-Item apps/sams-api/.env.example apps/sams-api/.env
Copy-Item apps/aps-api/.env.example apps/aps-api/.env
```

Generate local RSA key material into the untracked service `.env` files:

```powershell
npm run dev:keys
```

This command does not print private keys. It writes:

- SAMS signing key values to `apps/sams-api/.env`
- APS signing key values to `apps/aps-api/.env`
- the APS issuer key values to `apps/sams-api/.env` as `APS_JWT_*` so the shared login flow can issue APS-scoped credentials for local acceptance

Set both services to development database URLs. Local Supabase defaults to:

```text
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
AUTH_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NODE_ENV=development
ISKOOL_ENVIRONMENT=development
```

For connected Supabase dev/staging on Windows without Docker, prefer the Supabase dashboard's **Session pooler** connection string for server applications. Do not guess the pooler hostname. Open Database settings for project `ufwifbvozmmsajmmddmb`, copy the Session pooler URI, and replace only the database password locally.

Do not use the default Supabase `postgres` admin connection as the permanent APS/SAMS runtime URL. Runtime connections should use least-privilege development login roles:

- `apps/aps-api/.env`
  - `DATABASE_URL`: `iskool_aps_dev_login`
  - `AUTH_DATABASE_URL`: `iskool_auth_dev_login`
- `apps/sams-api/.env`
  - `DATABASE_URL`: `iskool_sams_dev_login`
  - `AUTH_DATABASE_URL`: `iskool_auth_dev_login`

The runtime login roles inherit these committed NOLOGIN privilege roles:

- `iskool_aps_runtime`
- `iskool_sams_runtime`
- `iskool_auth_runtime`

The app does not use MCP at runtime. MCP is only for operational inspection. The NestJS apps connect through PostgreSQL.

If a confirmed development/staging Supabase project does not yet have the remote-dev login roles, provision them with an administrative migration connection. This command is guarded and does not print passwords:

```powershell
$env:NODE_ENV="development"
$env:ISKOOL_ENVIRONMENT="development"
$env:ALLOW_REMOTE_DEV_PROVISION="true"
$env:MIGRATION_DATABASE_URL="<admin migration connection string>"
$env:ISKOOL_APS_DEV_DB_PASSWORD="<new APS runtime password>"
$env:ISKOOL_SAMS_DEV_DB_PASSWORD="<new SAMS runtime password>"
$env:ISKOOL_AUTH_DEV_DB_PASSWORD="<new auth runtime password>"
npm run db:provision:remote-dev
```

Never commit those passwords. Never run this against production.

## Inspect Database Safely

This command performs read-only checks. It verifies the connection, table presence, migration history, and RLS flags without printing credentials:

```powershell
npm run db:inspect:safe
```

Expect `PASS` lines for:

- `schools`
- `users`
- `memberships`
- `roles`
- `membership_roles`
- `user_credentials`
- `auth_sessions`
- `auth_refresh_tokens`
- `auth_login_continuations`
- `audit_events`

## Seed Development Accounts

The seed is idempotent and refuses to run unless development safety flags are explicit.

PowerShell:

```powershell
$env:NODE_ENV="development"
$env:ISKOOL_ENVIRONMENT="development"
$env:ALLOW_DEV_SEED="true"
$env:DEV_SEED_PASSWORD="Choose-a-local-password-123!"
npm run db:seed:dev
```

Bash/curl environment equivalent:

```bash
NODE_ENV=development ISKOOL_ENVIRONMENT=development ALLOW_DEV_SEED=true DEV_SEED_PASSWORD='Choose-a-local-password-123!' npm run db:seed:dev
```

Seeded schools:

- `School Alpha`
- `School Beta`

Seeded users:

- `admin.alpha@example.test` with `admin` in School Alpha
- `registrar.alpha@example.test` with `registrar` in School Alpha
- `teacher.alpha@example.test` with `teacher` in School Alpha
- `student.alpha@example.test` with `student` in School Alpha
- `finance.alpha@example.test` with `finance` in School Alpha
- `registrar.beta@example.test` with `registrar` in School Beta
- `multi.school@example.test` with `registrar` in School Alpha and `finance` in School Beta

All seeded accounts use `DEV_SEED_PASSWORD`.

## Start Backend

For Dockerless remote development, skip `npm run infra:up`. M2 identity/auth/audit acceptance does not require MinIO. Redis is currently checked by `/health/ready`, but `/health/live` and the auth smoke path are the required M2 gates.

For full local infrastructure with Docker, start Redis/MinIO:

```powershell
npm run infra:up
```

Start both APIs:

```powershell
npm run dev:backend
```

Health checks:

```powershell
curl.exe http://localhost:3002/api/v1/health/live
curl.exe http://localhost:3001/api/v1/health/live
```

Expected response:

```json
{"status":"ok","timestamp":"<iso timestamp>"}
```

## Automated Acceptance Smoke

Run in a second terminal with the same seed password:

```powershell
$env:DEV_SEED_PASSWORD="Choose-a-local-password-123!"
npm run acceptance:doctor -- --require-apis
npm run smoke:auth
npm run smoke:authorization
npm run smoke:audit
```

Expected output contains:

```text
PASS login
PASS SAMS token
PASS APS token
PASS APS token rejection
PASS SAMS token rejection
PASS refresh
PASS refresh rotation
PASS logout
PASS post-logout refresh rejection
PASS multi-school role isolation
PASS active membership allowed
PASS inactive membership denied
PASS wrong school denied
PASS forged school context denied
PASS wrong role denied
PASS audit transaction-local write
```

## Manual Login

PowerShell:

```powershell
$body = @{
  email = "admin.alpha@example.test"
  password = $env:DEV_SEED_PASSWORD
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3002/api/v1/auth/login `
  -ContentType "application/json" `
  -Body $body

$login.user
$login.school
$login.roles
$login.allowedScopes
```

curl:

```bash
curl -sS -X POST http://localhost:3002/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin.alpha@example.test","password":"Choose-a-local-password-123!"}'
```

Expected:

- HTTP `201`
- user identity for `admin.alpha@example.test`
- active School Alpha context
- `allowedScopes` includes `aps` and `sams`
- `accessTokens.aps`
- `accessTokens.sams`
- `refreshToken`

Supabase table expectation:

- `auth_sessions`: a session row exists for the user, school, and membership.
- `auth_refresh_tokens`: a refresh token digest row exists. The raw refresh token is never stored.

## Me

PowerShell:

```powershell
$samsToken = $login.accessTokens.sams
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/api/v1/auth/me `
  -Headers @{ Authorization = "Bearer $samsToken" }
```

curl:

```bash
curl -sS http://localhost:3002/api/v1/auth/me \
  -H "authorization: Bearer <SAMS_ACCESS_TOKEN>"
```

Expected:

- HTTP `200`
- authenticated `userId`
- active `membershipId`
- active `schoolId`
- `scope = sams`
- membership-scoped roles

APS equivalent:

```bash
curl -sS http://localhost:3001/api/v1/auth/me \
  -H "authorization: Bearer <APS_ACCESS_TOKEN>"
```

Expected `scope = aps`.

## Invalid Password

```bash
curl -i -X POST http://localhost:3002/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin.alpha@example.test","password":"wrong-password"}'
```

Expected:

- HTTP `401`
- standard `UNAUTHORIZED` error envelope
- no account enumeration details

## Wrong Service Token

APS token sent to SAMS:

```bash
curl -i http://localhost:3002/api/v1/auth/me \
  -H "authorization: Bearer <APS_ACCESS_TOKEN>"
```

Expected: HTTP `401`.

SAMS token sent to APS:

```bash
curl -i http://localhost:3001/api/v1/auth/me \
  -H "authorization: Bearer <SAMS_ACCESS_TOKEN>"
```

Expected: HTTP `401`.

## Refresh

```bash
curl -sS -X POST http://localhost:3002/api/v1/auth/refresh \
  -H 'content-type: application/json' \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

Expected:

- HTTP `200`
- new `refreshToken`
- new service-scoped `accessTokens`

Supabase table expectation:

- old `auth_refresh_tokens.consumed_at` is set
- old `auth_refresh_tokens.replaced_by_id` points to a successor
- successor refresh token row exists
- raw refresh token is not visible

Retrying the old refresh token should return HTTP `401` and revoke the session family.

## Logout

```bash
curl -sS -X POST http://localhost:3002/api/v1/auth/logout \
  -H "authorization: Bearer <SAMS_ACCESS_TOKEN>"
```

Expected:

- HTTP `200`
- `{ "status": "LOGGED_OUT" }`

Supabase table expectation:

- `auth_sessions.revoked_at` is set
- refresh attempts for that session return HTTP `401`

## Multi-School Context

Login without a school:

```bash
curl -sS -X POST http://localhost:3002/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"multi.school@example.test","password":"Choose-a-local-password-123!"}'
```

Expected:

- HTTP `201`
- `status = SCHOOL_SELECTION_REQUIRED`
- two schools are returned

Login again with the Alpha school id from the selection response:

```bash
curl -sS -X POST http://localhost:3002/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"multi.school@example.test","password":"Choose-a-local-password-123!","schoolId":"<ALPHA_SCHOOL_ID>"}'
```

Expected roles: `registrar`.

Login with the Beta school id:

```bash
curl -sS -X POST http://localhost:3002/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"multi.school@example.test","password":"Choose-a-local-password-123!","schoolId":"<BETA_SCHOOL_ID>"}'
```

Expected roles: `finance`.

There should be no cross-school role leakage.

## Authorization Smoke Scope

`npm run smoke:authorization` proves the reusable VIM-49 authorization kernel:

- active membership allowed
- inactive membership denied
- wrong school denied
- forged school context denied
- wrong role denied

Teacher/class and student-owned resource checks need real student/class/enrollment resources. VIM-51 and VIM-53 provide those concrete adapters.

## Audit Smoke

`npm run smoke:audit` writes a safe acceptance audit event using transaction-local principal settings.

Supabase table expectation:

- `audit_events.actor_user_id` is the seeded admin user
- `audit_events.actor_membership_id` is the seeded School Alpha admin membership
- `audit_events.school_id` is School Alpha
- `audit_events.request_id` starts with `m2-audit-`
- `audit_events.action = m2.acceptance.audit`
- `before_value` and `after_value` contain non-sensitive status markers

Inspect only safe columns unless you intentionally need to inspect JSON payloads.

## Supabase Tables to Inspect

Use the Supabase Table Editor for:

- `schools`
- `users`
- `memberships`
- `membership_roles`
- `roles`
- `auth_sessions`
- `auth_refresh_tokens`
- `auth_login_continuations`
- `audit_events`
