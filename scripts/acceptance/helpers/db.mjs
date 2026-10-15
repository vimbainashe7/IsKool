import { boolEnv, requireEnv } from './env.mjs';

export function databaseUrl() {
  return process.env.ACCEPTANCE_DATABASE_URL || process.env.DATABASE_URL || process.env.AUTH_DATABASE_URL;
}

export async function createPrisma(url = databaseUrl()) {
  if (!url) {
    throw new Error('DATABASE_URL or ACCEPTANCE_DATABASE_URL is required.');
  }
  const { PrismaClient } = await import('@prisma/client');
  return new PrismaClient({
    datasources: {
      db: { url }
    }
  });
}

export function assertDevSeedAllowed() {
  requireEnv('DEV_SEED_PASSWORD');
  const environment = requireEnv('ISKOOL_ENVIRONMENT');

  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Refusing to seed: NODE_ENV must be development.');
  }
  if (!['development', 'staging', 'testing'].includes(environment)) {
    throw new Error('Refusing to seed: ISKOOL_ENVIRONMENT must be development, staging, or testing.');
  }
  if (!boolEnv('ALLOW_DEV_SEED')) {
    throw new Error('Refusing to seed: ALLOW_DEV_SEED=true is required.');
  }

  const urlValue = databaseUrl();
  if (!urlValue) {
    throw new Error('Refusing to seed: DATABASE_URL or ACCEPTANCE_DATABASE_URL is required.');
  }
  const url = new URL(urlValue);
  const target = `${url.hostname}/${url.pathname}`.toLowerCase();
  if (target.includes('prod') || target.includes('production')) {
    throw new Error('Refusing to seed a database URL that appears to be production.');
  }
}

export async function safeDatabaseSnapshot(prisma) {
  const tableRows = await prisma.$queryRaw`
    SELECT
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled,
      c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'schools',
        'users',
        'memberships',
        'roles',
        'membership_roles',
        'user_credentials',
        'auth_sessions',
        'auth_refresh_tokens',
        'auth_login_continuations',
        'audit_events'
      )
    ORDER BY c.relname
  `;

  const migrationRows = await prisma.$queryRaw`
    SELECT version, name
    FROM supabase_migrations.schema_migrations
    ORDER BY version
  `;

  return { tables: tableRows, migrations: migrationRows };
}
