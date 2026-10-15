# ADR-0011: Supabase PostgreSQL RLS Foundation

Status: Accepted

Date: 2026-10-06

## Context

IsKool uses Supabase-hosted and Supabase-local PostgreSQL as the physical database. The legacy MySQL master-schema model cannot be ported table-for-table because IsKool data is school-scoped and tenant isolation must exist before domain tables are migrated.

Supabase Auth is not part of this foundation. Authentication is future application work; database isolation must not depend on `auth.uid()`, Supabase browser sessions, or direct frontend writes to domain tables.

## Decision

- Physical database: Supabase PostgreSQL.
- Migration authority: `supabase/migrations/`.
- ORM: Prisma for typed application queries.
- Canonical Prisma mapping: `database/prisma/schema.prisma`.
- RLS: PostgreSQL Row Level Security is mandatory for tenant-sensitive data.
- Authentication: not Supabase Auth in this phase.
- Application access: NestJS -> Prisma -> PostgreSQL.
- Frontend access: no direct writes to domain tables through Supabase.
- Runtime DB users: least-privilege application roles with no superuser and no `BYPASSRLS`.
- Principal context: NestJS opens a database transaction and sets transaction-local PostgreSQL settings for `iskool.user_id`, `iskool.school_id`, and `iskool.membership_id`.
- Multi-school model: users belong to schools through memberships.
- Roles: role assignment is membership-scoped through `membership_roles`.
- Timestamps: persisted platform timestamps use `timestamptz` with database-managed `updated_at`.
- Money: future persisted financial amounts use `numeric(19,4)` plus explicit currency fields unless a later finance ADR replaces this with a stronger convention.

## Tenant Model

The first platform migration defines only shared identity and tenant context:

- `schools`
- `users`
- `memberships`
- `roles`
- `membership_roles`

Product domain tables such as students, assignments, attendance, finance, and AI jobs are deliberately excluded.

## RLS Principal Flow

An authenticated NestJS request resolves a server-trusted `(user_id, school_id, membership_id)` tuple. Repository work then runs inside a transaction that sets those values with transaction-local PostgreSQL settings. RLS policies validate that the membership is active and that the tuple is internally consistent before tenant rows are visible or mutable.

The database does not trust a client-provided `school_id` by itself. A forged school with a real user and unrelated membership fails closed because policies verify the full tuple against `memberships`.

## Runtime Roles

Migrations create NOLOGIN privilege roles:

- `iskool_aps_runtime`
- `iskool_sams_runtime`

Operational LOGIN principals inherit those roles outside schema source control. Passwords are never committed in migrations. Runtime roles must remain `rolsuper = false` and `rolbypassrls = false`.

VIM-46 grants runtime roles read access to the platform tenant foundation only. Runtime writes to `schools`, `users`, `memberships`, and `membership_roles` remain closed until a later issue adds explicit administrative authorization.

## Prisma

Prisma is not the migration engine. Schema changes follow this workflow:

1. Create or edit a Supabase SQL migration under `supabase/migrations/`.
2. Apply/reset a fresh Supabase database from migrations.
3. Update `database/prisma/schema.prisma`.
4. Run Prisma validate/generate against the canonical schema.
5. Run database/RLS integration tests as the runtime role.

Application-specific Prisma migration folders are not used for this physical database.

## Consequences

- Cross-school isolation exists before domain tables are added.
- A user can hold different roles in different schools without privilege leakage.
- Runtime application traffic cannot rely on the Supabase administrative `postgres` role.
- VIM-47 CI must build a fresh database from Supabase migrations, validate Prisma alignment, and run RLS tests as a non-bypass runtime role.
