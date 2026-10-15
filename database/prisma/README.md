# Prisma

This directory owns the canonical integrated Prisma schema.

```text
database/prisma/schema.prisma
```

The physical database migration authority is `supabase/migrations/`.

Do not create separate APS and SAMS migration histories against the same physical Supabase/PostgreSQL database.

Use:

```bash
npm run prisma:validate
npm run prisma:generate
```

Do not use `prisma migrate dev`; Prisma is the typed query layer, not the migration engine.
