import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadEnvFile } from './helpers/env.mjs';
import { defaultApsBaseUrl, defaultSamsBaseUrl, healthCheck, prismaClientGenerated } from './helpers/preflight.mjs';

const requireApis = process.argv.includes('--require-apis');
let failures = 0;

function ok(label, detail = '') {
  console.log(`OK   ${label}${detail ? ` - ${detail}` : ''}`);
}

function warn(label, detail = '') {
  console.log(`WARN ${label}${detail ? ` - ${detail}` : ''}`);
}

function fail(label, detail = '') {
  failures += 1;
  console.log(`FAIL ${label}${detail ? ` - ${detail}` : ''}`);
}

function redactUrl(url) {
  if (!url) {
    return '';
  }
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = '***';
    return parsed.toString();
  } catch {
    return '<invalid url>';
  }
}

function readServiceEnv(serviceName) {
  const previous = { ...process.env };
  loadEnvFile('.env');
  loadEnvFile(`apps/${serviceName}/.env`);
  const loaded = { ...process.env };
  process.env = previous;
  return loaded;
}

function checkEnv(label, env, required) {
  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    fail(`${label} env`, `missing ${missing.join(', ')}`);
    return false;
  }
  ok(`${label} env`, `DATABASE_URL=${redactUrl(env.DATABASE_URL)}`);
  return true;
}

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
if (nodeMajor === 22) {
  ok('Node version', process.version);
} else {
  fail('Node version', `expected 22.x, received ${process.version}`);
}

if (existsSync('node_modules')) {
  ok('dependencies', 'node_modules exists');
} else {
  fail('dependencies', 'run npm ci');
}

const tscPath = process.platform === 'win32' ? 'node_modules\\.bin\\tsc.cmd' : 'node_modules/.bin/tsc';
if (existsSync(tscPath)) {
  const result = spawnSync(`"${tscPath}" --version`, {
    encoding: 'utf8',
    shell: true
  });
  if (result.status === 0) {
    ok('TypeScript binary', result.stdout.trim());
  } else {
    fail('TypeScript binary', (result.stderr || result.stdout || `${tscPath} --version failed`).trim());
  }
} else {
  fail('TypeScript binary', 'node_modules/.bin/tsc not found; run npm ci');
}

if (prismaClientGenerated()) {
  ok('Prisma generated', 'node_modules/@prisma/client/index.js exists');
} else {
  fail('Prisma generated', 'run npm run prisma:generate');
}

const commonEnv = [
  'NODE_ENV',
  'SERVICE_NAME',
  'PORT',
  'DATABASE_URL',
  'JWT_PRIVATE_KEY_PEM',
  'JWT_PUBLIC_KEY_PEM',
  'JWT_KEY_ID'
];
const apsEnv = readServiceEnv('aps-api');
const samsEnv = readServiceEnv('sams-api');
const redisEnv = (env) => (env.REDIS_ENABLED === 'false' ? [] : ['REDIS_HOST', 'REDIS_PORT']);
const apsEnvOk = checkEnv('APS', apsEnv, [...commonEnv, ...redisEnv(apsEnv), 'SAMS_INTERNAL_BASE_URL']);
const samsEnvOk = checkEnv('SAMS', samsEnv, [
  ...commonEnv,
  ...redisEnv(samsEnv),
  'APS_JWT_PRIVATE_KEY_PEM',
  'APS_JWT_PUBLIC_KEY_PEM',
  'APS_JWT_KEY_ID'
]);

for (const [label, env] of [['APS', apsEnv], ['SAMS', samsEnv]]) {
  ok(`${label} Redis`, env.REDIS_ENABLED === 'false' ? 'disabled for local development' : 'enabled');
}

if (prismaClientGenerated() && samsEnv.DATABASE_URL) {
  process.env = { ...process.env, ...samsEnv };
  try {
    const { createPrisma } = await import('./helpers/db.mjs');
    const prisma = await createPrisma();
    try {
      await prisma.$queryRaw`SELECT 1`;
      ok('database', `reachable via ${redactUrl(samsEnv.DATABASE_URL)}`);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    fail('database', error instanceof Error ? error.message : String(error));
  }
} else if (apsEnvOk || samsEnvOk) {
  warn('database', 'skipped because Prisma or DATABASE_URL is missing');
}

const [samsHealth, apsHealth] = await Promise.all([
  healthCheck('SAMS :3002', defaultSamsBaseUrl),
  healthCheck('APS :3001', defaultApsBaseUrl)
]);

for (const result of [apsHealth, samsHealth]) {
  if (result.ok) {
    ok(result.label, result.url);
  } else if (requireApis) {
    fail(result.label, `${result.url} is down`);
  } else {
    warn(result.label, `${result.url} is down`);
  }
}

if (failures > 0) {
  console.error(`Doctor found ${failures} failure(s).`);
  process.exit(1);
}

console.log('PASS acceptance doctor');
