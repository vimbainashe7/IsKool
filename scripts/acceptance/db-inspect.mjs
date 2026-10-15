import { createPrisma, safeDatabaseSnapshot } from './helpers/db.mjs';
import { loadServiceEnv } from './helpers/env.mjs';

loadServiceEnv('sams-api');

const prisma = await createPrisma(process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL);
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('PASS database connection');

  const snapshot = await safeDatabaseSnapshot(prisma);
  for (const table of snapshot.tables) {
    console.log(
      `PASS table ${table.table_name} rls=${table.rls_enabled ? 'on' : 'off'} forced=${table.rls_forced ? 'on' : 'off'}`
    );
  }
  console.log(`PASS migrations ${snapshot.migrations.length}`);
} finally {
  await prisma.$disconnect();
}
