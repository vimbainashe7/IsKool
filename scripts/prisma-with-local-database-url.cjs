const { spawnSync } = require('node:child_process');

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const args = process.argv.slice(2);
const result = spawnSync('prisma', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(result.status ?? 1);
