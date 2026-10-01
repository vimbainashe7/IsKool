# Starter Audit - IsKool Frontend

Date: 2026-09-28

## Current Baseline

The frontend is a Next.js 16 App Router application adapted from a shadcn dashboard/landing starter. The earlier dual `vite-version` / `nextjs-version` package layout has been collapsed so `frontend_base` is the runnable app root.

## Feature Inventory

| Area | Status | Notes |
| --- | --- | --- |
| Next.js App Router | KEEP | `src/app` route groups are present and build successfully. |
| shadcn/ui components | KEEP | Copy-owned components exist under `src/components/ui`. |
| Base UI | ADAPT | `@base-ui/react` is installed for future primitive adoption. Existing primitives still use shadcn/Radix. |
| Login page | ADAPT | Present at `/sign-in`; currently UI-only and needs backend auth contract. |
| Sign-up page | ADAPT | Present at `/sign-up`; should become invite/activation aware. |
| Forgot password | ADAPT | Present at `/forgot-password`; UI-only. |
| Reset password | NOT PRESENT | No dedicated reset-password route was found. |
| Authenticated layout | ADAPT | Existing `(dashboard)` shell is reused as the IsKool app shell. No real session guard exists yet. |
| Session provider | NOT PRESENT | No backend-backed session provider exists. A fixture contract now documents the expected shape. |
| Route protection | REPLACE | `src/proxy.ts` only redirects legacy auth paths. Real route protection is backend/session work. |
| Sidebar | ADAPT | Reused and now generated from centralized capability-aware navigation. |
| Mobile navigation | ADAPT | shadcn sidebar has responsive behavior; role-specific mobile UX still needs dedicated testing. |
| Profile menu | ADAPT | Present via `NavUser`; still fixture-backed. |
| Theme support | KEEP | `next-themes` and CSS variables are present. |
| Settings | ADAPT | Settings pages exist from starter; need IsKool-specific content. |
| Forms | ADAPT | React Hook Form + Zod exist. Need a documented server-validation pattern. |
| Data tables | ADAPT | TanStack Table exists. Normal tables are usable; gradebook needs a specialized decision. |
| Notifications | STRUCTURED | A route/shell entry exists; backend contract missing. |
| Breadcrumbs | ADAPT | UI component exists; header does not yet render route-derived breadcrumbs. |
| Command menu | ADAPT | Rewired to capability navigation. Search backend contract missing. |
| Dark mode | KEEP | Works through existing provider and mode toggle. |
| Accessibility behavior | ADAPT | shadcn primitives help, but keyboard/focus testing is still required. |
| Backend/API integration | NOT PRESENT | No frontend API client/session integration was found. |
| Tests | NOT PRESENT | No frontend test script or test suite exists. |
| CI | ADAPT | Starter `.github` docs/workflows exist, but frontend CI is not ratified for IsKool. |

## Conflicts With Target Architecture

- The starter still contains many template demo routes (`mail`, `pricing`, `faqs`, duplicate auth variants, landing sections).
- There is no real authentication/session/capability contract.
- There is no PostgreSQL/RLS integration from the frontend, and there must not be direct privileged DB access from the browser.
- Existing docs mostly describe the old template and Vite/Next choice; IsKool docs now live in `docs/frontend`.
- The app root is `frontend_base`, not `apps/web`; this pass documents the target but keeps the working root stable.

## Baseline Verification

Before this pass, `pnpm lint` and `pnpm build` passed after the prior cleanup, with lint warnings from retained TanStack Table demos.
