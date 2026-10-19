# IsKool

One school platform: Next.js frontend, APS academic API and SAMS administration API. Live authentication uses IsKool APIs, HttpOnly cookies, Supabase PostgreSQL, Prisma and least-privilege runtime logins. Supabase Auth is not the login provider. The approved hosted development workflow needs no Docker; Redis may be disabled in development.

## Windows quick start

All root commands below run in **C:\Users\User\Documents\aiDo\IsKool_unified**. `frontend_base` is a subdirectory, not a separate backend checkout. Never run backend npm scripts there.

### First-time setup

```powershell
cd C:\Users\User\Documents\aiDo
# Only when the folder does not already exist:
git clone https://github.com/vimbainashe7/IsKool.git IsKool_unified
cd IsKool_unified
git remote show origin
git status --short
# For an existing clean checkout on the default branch:
git pull --ff-only
```

Preserve local work before changing branches. The remote default branch is currently `frontend/workspace-redesigns-2026-10-13`; do not assume it is named main. Both APIs, `packages/auth`, `database/prisma`, `supabase/migrations`, `scripts/acceptance` and `frontend_base` must be present.

Install Node **22** for the backend and Node **24** for the frontend, npm >=10, pnpm 12 and Git. With nvm-windows, install both versions. Avoid `nvm use` while services are running: it changes a shared symlink. Use independent executables instead:

```powershell
nvm install 22.20.0
nvm install 24.15.0
$node22 = Join-Path $env:NVM_HOME 'v22.20.0/node.exe'
$node24 = Join-Path $env:NVM_HOME 'v24.15.0/node.exe'
$npm22 = Join-Path $env:NVM_HOME 'v22.20.0/node_modules/npm/bin/npm-cli.js'
$env:Path = "$(Split-Path $node22);$env:Path"
& $node22 $npm22 ci
& $node22 $npm22 run prisma:generate
& $node22 $npm22 run prisma:validate

cd frontend_base
$env:Path = "$(Split-Path $node24);$env:Path"
pnpm install --frozen-lockfile
cd ..
```

If Node lives elsewhere, use its absolute executable path. The launcher discovers installed nvm versions or accepts `$env:ISKOOL_NODE22` and `$env:ISKOOL_NODE24`, each an absolute `node.exe` path.

Configure ignored `.env`, `apps/aps-api/.env`, and `apps/sams-api/.env` from their examples and the [database configuration guide](docs/architecture/LOCAL_DEVELOPMENT.md). Preserve existing ignored files. Obtain credentials from the project owner; never commit them. Use `NODE_ENV=development`, `ISKOOL_ENVIRONMENT=development` (or a verified staging/testing project), `REDIS_ENABLED=false`, matching signing keys, and separate `iskool_aps_dev_login`, `iskool_sams_dev_login` and `iskool_auth_dev_login` session-pooler connections. Administrator URLs belong only in explicit migration/provisioning tooling.

Configure ignored `frontend_base/.env.local`:

```dotenv
ISKOOL_SAMS_API_URL=http://127.0.0.1:3002/api/v1
ISKOOL_APS_API_URL=http://127.0.0.1:3001/api/v1
ISKOOL_ENABLE_DEMO=false
NEXT_PUBLIC_ISKOOL_DEMO=false
ISKOOL_DEV_ACCOUNTS=true
```

Remove duplicate assignments, especially old preview flags. No database URL, private key or development password belongs in a NEXT_PUBLIC variable.

### Start all services

From the canonical root, either installed Node can invoke the launcher:

```powershell
cd C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:check
npm run dev:iskool
```

The Windows launcher independently selects Node 22/24, validates non-production runtime database privileges, checks all requested ports before starting, builds backend code, then waits for actual database readiness and frontend sign-in. It reuses compatible healthy services from this checkout, reports stale/foreign listeners, and never kills arbitrary PIDs. Ctrl+C stops only children it started. Startup runs no migrations, provisioning or seeds. Backend source edits require restarting the launcher to rebuild; the frontend retains Next.js hot reload.

Unchanged backend sources reuse a verified build. The first frontend compilation on an 8 GB Windows laptop can take several minutes; startup prints its wait and allows up to five minutes before failing. Free memory by closing unused apps if worker startup or compilation times out.
On a memory-constrained laptop, stop the dev launcher with Ctrl+C while running unit tests or production builds, then restart it for live browser acceptance.

If your prompt currently ends in `\frontend_base>`, first return to the root with `cd ..` (or use the absolute `cd` above). Do not run `cd frontend_base` while already in that directory. Do not use `pnpm dev` for the connected acceptance session: that starts only Next.js and leaves APS/SAMS unavailable. If an older launcher is still running, stop that terminal with `Ctrl+C` before starting a new one. A successful connected start prints `READY aps`, `READY sams`, `READY frontend`, and then `PASS LIVE IsKool ready`.

### Start backend separately

```powershell
cd C:\Users\User\Documents\aiDo\IsKool_unified
# This entry point selects the independent Node 22 executable.
npm run dev:backend
```

For backend watch development, use Node 22 and the existing `npm run dev:sams` and `npm run dev:aps` in separate root terminals. Stop these terminals before transferring ownership to the unified launcher.

### Start frontend separately

```powershell
cd C:\Users\User\Documents\aiDo\IsKool_unified
npm run dev:frontend
```

Or use a Node 24 terminal directly:

```powershell
cd C:\Users\User\Documents\aiDo\IsKool_unified\frontend_base
$env:Path = "$env:NVM_HOME/v24.15.0;$env:Path"
pnpm dev --port 3000
```

`pnpm dev` binds only to 127.0.0.1. Quick-fill requires the server's loopback launcher marker, explicit local flag, development environment and local request host. It is unavailable in production, known deployment environments, forwarded requests and CI. Frontend-only mode does not assert that APIs are running; verify their readiness below.

### Verify services

| Service | URL |
| --- | --- |
| Frontend live sign-in | http://127.0.0.1:3000/sign-in |
| APS readiness | http://127.0.0.1:3001/api/v1/health/ready |
| SAMS readiness | http://127.0.0.1:3002/api/v1/health/ready |
| APS Swagger | http://127.0.0.1:3001/api/v1/docs |
| SAMS Swagger | http://127.0.0.1:3002/api/v1/docs |

Both readiness responses must report `status=ok`, `database=ok` and `redis=disabled` (or healthy Redis). HTTP 200 alone is insufficient. A demo preview is not a live authenticated session.

### Developer sign-in

Open `/sign-in`. In **Development accounts**, enter the seed password configured in the ignored backend `DEV_SEED_PASSWORD` once for the current page. The password comes from the developer who configured the approved development fixtures, not from Supabase or frontend source.

| Button | Email filled |
| --- | --- |
| Student | student.alpha@example.test |
| Teacher | teacher.alpha@example.test |
| Admin | admin.alpha@example.test |

A button fills the real email field and applies your manually entered password. It never submits, creates a user, assigns a role or bypasses authentication. Click **Sign in** explicitly. The backend verifies school membership and routes to the corresponding dashboard. Reload to check session persistence; use Profile menu ? Sign out, then revisit the dashboard to check access is revoked. Repeat for each role. The helper password is held only in the mounted page; reload/navigation clears it. Enter it again after signing out.

Fixtures must already exist. Startup never seeds. Only after the owner verifies the target is development/staging and authorizes fixture writes, use the guarded `npm run db:seed:dev` command. Do not mutate an unknown hosted project.

Live authentication is implemented. Academic dashboard projection APIs remain future domain work: an empty academic dashboard after successful sign-in is an honest current state, not proof that assignments, grades or attendance are complete.

### Full acceptance

Backend, from the root with Node 22 first on PATH:

```powershell
npm run acceptance:doctor
npm run verify
npm run smoke:auth
npm run smoke:authorization
npm run smoke:audit
```

The historical `npm run acceptance:m2` command includes development **seeding**. Use it only for an explicitly approved development fixture database; it is not a read-only health check. The smoke commands also create/revoke test sessions and write audit evidence.

Frontend, from `frontend_base` with Node 24:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:secrets
pnpm test:production-accounts # Stop the dev frontend first; checks a real production server.
$env:ISKOOL_LIVE_AUTH='true'
$env:ISKOOL_E2E_PORT='3000'
# Set ISKOOL_TEST_PASSWORD privately to the configured fixture password.
# Never paste credentials into committed scripts or reports.
pnpm exec playwright test tests/e2e/live-auth.spec.ts
Remove-Item Env:ISKOOL_TEST_PASSWORD -ErrorAction SilentlyContinue
```

Live tests require the live APIs and approved fixture identities. Demo workflow tests (`pnpm test:e2e` without live mode) exercise a separate preview and do not prove live authentication. See [M2 acceptance](docs/acceptance/M2-IDENTITY-AUTHORIZATION.md) for backend boundaries.

### Troubleshooting

| Symptom | Action |
| --- | --- |
| Missing root package.json | Confirm `Get-Location`, `git branch --show-current`, and `Test-Path package.json`. Use the full canonical checkout, not an old frontend branch. Preserve local changes before switching. |
| Missing npm script | Backend scripts run at root; `pnpm dev` runs in frontend_base. Inspect `npm run` in the correct folder. |
| Port 3000/3001/3002 occupied | Run `npm run dev:check`. Inspect the identified checkout, PID and command. Reuse a compatible healthy server or stop its known terminal with Ctrl+C. Never blindly taskkill node.exe. |
| Launcher prints `Command failed: /d` before starting services | Stop that terminal with `Ctrl+C`, return to the repository root, and rerun `npm run dev:iskool`; the current launcher executes pnpm with pinned Node 24 and no `/d` shell wrapper. |
| Missing Prisma client | With Node 22 at root run `npm ci`, then `npm run prisma:generate`. Generate does not migrate. |
| Unsupported Node | Backend requires 22; frontend toolchain requires 24. Use independent pinned executables; do not switch a running nvm symlink. |
| Database unreachable | Check VPN/network, the session-pooler hostname/port, database password, ssl settings and project status. Run the doctor. Do not substitute a fake DB. |
| Wrong Supabase runtime login | Use service-specific APS/SAMS logins and the dedicated auth login. Never use postgres, service_role or a bypass-RLS login for normal requests. |
| Empty academic dashboard | Verify identity and role first. Live academic projections are not implemented yet; do not enable demo mode to conceal missing APIs. |
| Quick-fill missing | Use the loopback dev launcher on port 3000, set ISKOOL_DEV_ACCOUNTS=true in ignored frontend env, restart, and remove forwarded/deployment configuration. Production intentionally hides it. |

## Deeper documentation

[Local database configuration](docs/architecture/LOCAL_DEVELOPMENT.md) � [M2 acceptance](docs/acceptance/M2-IDENTITY-AUTHORIZATION.md) � [Repository topology](docs/adr/0010-single-repository-monorepo.md) � [Frontend contracts](frontend_base/docs/frontend/BACKEND_CONTRACTS.md).

Canonical physical migrations live in `supabase/migrations`; Prisma is the typed query mapping in `database/prisma/schema.prisma`. APS accesses SAMS-owned resources through authenticated SAMS APIs. Keep JWT guards, tenant isolation, RLS and least-privilege database roles enabled. Destructive database resets are explicit operations and never part of startup.
