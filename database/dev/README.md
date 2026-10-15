# Development Database Bootstrap

This directory is no longer an active local database bootstrap path.

Supabase local PostgreSQL is reset explicitly with:

```bash
npm run supabase:db:reset
```

That command is destructive and must not run automatically during application startup or normal test commands.

Do not treat this directory as a second schema authority. The canonical physical migrations live under `supabase/migrations/`.
