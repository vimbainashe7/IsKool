# IsKool Frontend

Shared Next.js frontend foundation for the IsKool school operations platform.

## Direction

IsKool is one product and one frontend. Users authenticate once, receive a school context, roles, and capabilities, then see the workspace relevant to their responsibilities.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Base UI
- pnpm

## Run

```bash
pnpm install
pnpm dev
```

## Verify

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:secrets
pnpm test:e2e
pnpm test:rls
```

Vitest tests domain rules, components and HTTP integration. Playwright tests workflows, six viewport sizes and accessibility using an explicitly enabled development adapter. Live Supabase authentication/provider execution and deployed RLS require a configured test environment. `test:rls` refuses non-local databases and fails when prerequisites are missing.

## Frontend Source Of Truth

- `docs/frontend/STARTER_AUDIT.md`
- `docs/frontend/ARCHITECTURE.md`
- `docs/frontend/UI_PRIMITIVES.md`
- `docs/frontend/CRITICAL_USER_FLOWS.md`
- `docs/frontend/ROUTE_CAPABILITY_MATRIX.md`

## Current Contract Status

Supabase SSR resolves verified identity and trusted active membership roles. Public signup cannot choose roles. The typed read adapter never substitutes samples for live failures. Production writes and file services are unavailable until the contracts and policy fixes in `docs/frontend/BACKEND_CONTRACTS.md` are verified.

For explicit local preview, set `ISKOOL_ENABLE_DEMO=true` and `NEXT_PUBLIC_ISKOOL_DEMO=true`, leave Supabase unconfigured, then run `pnpm dev`. The server refuses this adapter in production or with Supabase configured. Each HTTP-only preview-session cookie isolates persisted sample data and actual test uploads under ignored `.cache/iskool-demo`. Invitations do not send email; AI output is a labeled deterministic sample. The adapter supports one local server process.

Completion evidence: `docs/frontend/FRONTEND_COMPLETION_MATRIX.md`, `BACKEND_CONTRACTS.md`, `GRADEBOOK_DECISION.md`, and `QA_REPORT.md`. Existing migrations are blueprints with known ownership/security defects; their presence is not proof of deployed RLS.
