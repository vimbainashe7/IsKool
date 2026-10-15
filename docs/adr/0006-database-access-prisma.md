# ADR-0006: Database Access Prisma

Status: Accepted

Date: 2026-09-19

## Context

Revision 2.0 mandated MySQL 8/InnoDB and explicit transaction discipline, but did not mandate Prisma. The current IsKool v2 database architecture uses Supabase/PostgreSQL with mandatory Row Level Security.

## Decision

Use Prisma for typed API persistence. Use `supabase/migrations/` as the physical database migration authority so PostgreSQL RLS policies, grants, functions, triggers, constraints, and indexes are versioned with the schema.

## Alternatives Considered

- Raw SQL only: maximum control but slower contributor onboarding.
- TypeORM: framework-friendly but historically more migration foot-guns.

## Consequences

Repositories use Prisma; services own transaction boundaries; controllers never access Prisma. Migrations are forward-safe and destructive changes require a plan.

## Migration / Follow-up

Domain migrations are created only after schema ambiguities are resolved.

## References

- Revision 2.0, APS Section 7.2
- Revision 2.0, SAMS Section 10
