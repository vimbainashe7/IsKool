import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { readLocalEnv } from './helpers/local-env.mjs';
import { assertHealthyApis } from './helpers/preflight.mjs';

// Explicit development-only browser smoke. Credentials enter only the child
// environment; traces are disabled and the live reporter redacts artifacts.
async function main() {
  const env = readLocalEnv(['.env', 'apps/sams-api/.env'], process.env);
  if (env.NODE_ENV !== 'development' || env.ISKOOL_ENVIRONMENT !== 'development') {
    throw new Error('Requires explicitly configured development services.');
  }
  if (!env.DEV_SEED_PASSWORD) throw new Error('Configure the private DEV_SEED_PASSWORD in ignored local environment files.');
  if (process.env.CI) throw new Error('Run this live smoke locally against approved development; CI uses disposable SQL and contract tests.');
  const cli = resolve('frontend_base/node_modules/@playwright/test/cli.js');
  if (!existsSync(cli)) throw new Error('Install frontend dependencies before running this smoke.');
  await assertHealthyApis();
  const response = await fetch('http://127.0.0.1:3000/sign-in', { signal: AbortSignal.timeout(30000), redirect: 'manual' });
  if (!response.ok) throw new Error('Start npm run dev:iskool and verify port 3000 is ready.');
  const child = spawn(process.execPath, [cli, 'test', 'tests/e2e/student-administration.spec.ts', '--workers=1'], {
    cwd: resolve('frontend_base'),
    env: { ...process.env, ISKOOL_LIVE_AUTH: 'true', ISKOOL_E2E_PORT: '3000', ISKOOL_TEST_PASSWORD: env.DEV_SEED_PASSWORD },
    stdio: 'inherit',
  });
  const code = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', value => resolveExit(value ?? 1));
  });
  process.exitCode = code;
}
main().catch(() => {
  console.error('VIM-51 smoke failed. Check development configuration, running services and docs/acceptance/VIM-51.md. Private diagnostics withheld.');
  process.exitCode = 1;
});
