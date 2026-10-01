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
pnpm build
```

There is no frontend test suite yet.

## Frontend Source Of Truth

- `docs/frontend/STARTER_AUDIT.md`
- `docs/frontend/ARCHITECTURE.md`
- `docs/frontend/UI_PRIMITIVES.md`
- `docs/frontend/CRITICAL_USER_FLOWS.md`
- `docs/frontend/ROUTE_CAPABILITY_MATRIX.md`

## Current Contract Status

Session, role, capability, and school context are currently fixture-backed in `src/dev/fixtures`. They are UI composition scaffolding only. Real authorization must come from server session context, backend policy, and PostgreSQL RLS.
