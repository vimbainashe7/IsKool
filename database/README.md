# Database

The canonical physical database schema belongs here.

PostgreSQL physical migrations are canonical under `supabase/migrations/` so RLS policies, grants, functions, triggers, constraints, and indexes are versioned with the tables they protect.

Prisma maps the committed database structure from one canonical schema:

```text
database/
  prisma/
    schema.prisma
```

`database/prisma/` is reserved for Prisma ORM mapping and generated client alignment. It is not the physical migration authority.

Do not create competing Prisma migration histories against the same physical Supabase/PostgreSQL database.

Schema changes must be made as Supabase SQL migrations first, then reflected in `database/prisma/schema.prisma`.

## Drift Check

`npm run db:drift:check` compares the migrated PostgreSQL database with `database/prisma/schema.prisma` using `prisma migrate diff`.

The check is deliberately scoped to Prisma-mapped tables, columns, relations, and scalar types. It does not make Prisma authoritative for PostgreSQL security objects such as RLS policies, grants, roles, triggers, or helper functions. Those remain owned by Supabase SQL migrations.
