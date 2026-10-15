import { spawnSync } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const schemaPath = process.env.PRISMA_SCHEMA_PATH ?? 'database/prisma/schema.prisma';

const result = spawnSync(
  'npx',
  [
    'prisma',
    'migrate',
    'diff',
    '--from-url',
    databaseUrl,
    '--to-schema-datamodel',
    schemaPath,
    '--exit-code'
  ],
  {
    encoding: 'utf8',
    shell: process.platform === 'win32'
  }
);

if (result.status === 0) {
  console.log('Prisma mapped schema matches the migrated PostgreSQL schema.');
  process.exit(0);
}

if (result.status === 2) {
  console.error('Prisma mapped schema drift detected.');
  if (result.stdout.trim()) {
    console.error(result.stdout.trim());
  }
  if (result.stderr.trim()) {
    console.error(result.stderr.trim());
  }
  process.exit(1);
}

if (result.stdout.trim()) {
  console.error(result.stdout.trim());
}
if (result.stderr.trim()) {
  console.error(result.stderr.trim());
}
process.exit(result.status ?? 1);
