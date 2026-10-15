import { createPrisma } from './helpers/db.mjs';
import { boolEnv, loadEnvFile, requireEnv } from './helpers/env.mjs';

loadEnvFile('.env');

const environment = requireEnv('ISKOOL_ENVIRONMENT');
if (!['development', 'staging', 'testing'].includes(environment)) {
  throw new Error('Refusing to provision: ISKOOL_ENVIRONMENT must be development, staging, or testing.');
}
if (process.env.NODE_ENV !== 'development') {
  throw new Error('Refusing to provision: NODE_ENV must be development.');
}
if (!boolEnv('ALLOW_REMOTE_DEV_PROVISION')) {
  throw new Error('Refusing to provision: ALLOW_REMOTE_DEV_PROVISION=true is required.');
}

process.env.ACCEPTANCE_DATABASE_URL = requireEnv('MIGRATION_DATABASE_URL');

const loginRoles = [
  {
    loginRole: 'iskool_aps_dev_login',
    runtimeRole: 'iskool_aps_runtime',
    password: requireEnv('ISKOOL_APS_DEV_DB_PASSWORD')
  },
  {
    loginRole: 'iskool_sams_dev_login',
    runtimeRole: 'iskool_sams_runtime',
    password: requireEnv('ISKOOL_SAMS_DEV_DB_PASSWORD')
  },
  {
    loginRole: 'iskool_auth_dev_login',
    runtimeRole: 'iskool_auth_runtime',
    password: requireEnv('ISKOOL_AUTH_DEV_DB_PASSWORD')
  }
];

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function quoteIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

async function main() {
  const prisma = await createPrisma();
  try {
  for (const { loginRole, runtimeRole, password } of loginRoles) {
    const loginIdent = quoteIdentifier(loginRole);
    const runtimeIdent = quoteIdentifier(runtimeRole);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${quoteLiteral(loginRole)}) THEN
          CREATE ROLE ${loginIdent}
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            INHERIT
            NOBYPASSRLS;
        END IF;
      END
      $$;
    `);
    // Supabase's managed postgres role can rotate passwords for roles it
    // creates, but cannot alter SUPERUSER-related attributes afterward.
    await prisma.$executeRawUnsafe(`ALTER ROLE ${loginIdent} PASSWORD ${quoteLiteral(password)};`);
    await prisma.$executeRawUnsafe(`GRANT ${runtimeIdent} TO ${loginIdent};`);
    console.log(`PASS provisioned ${loginRole} as member of ${runtimeRole}`);
  }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const secrets = [
    process.env.MIGRATION_DATABASE_URL,
    ...loginRoles.map((role) => role.password)
  ].filter(Boolean);
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) {
    message = message.replaceAll(secret, '[redacted]');
  }
  console.error(`FAIL remote dev provisioning - ${message}`);
  process.exit(1);
});
