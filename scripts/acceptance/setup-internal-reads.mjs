import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLocalEnv } from './helpers/local-env.mjs';

// Explicit local configuration only. Never rotates user passwords, JWT keys,
// changes database records or runs automatically during application startup.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
try {
  const paths = ['sams', 'aps'].map(service => resolve(root, `apps/${service}-api/.env`));
  const envs = paths.map(path => readLocalEnv([path], {}));
  if (envs.some(env => env.NODE_ENV !== 'development' || !['development', 'testing'].includes(env.ISKOOL_ENVIRONMENT)))
    throw new Error('Both local API env files must explicitly identify a development/testing environment.');
  const keys = envs.map(env => env.SAMS_INTERNAL_SERVICE_KEY).filter(Boolean);
  if (keys.some(key => !/^[A-Za-z0-9_-]{43,86}$/.test(key)) || new Set(keys).size > 1)
    throw new Error('Service keys are invalid or different. Resolve the local configuration without overwriting either key.');
  const key = keys[0] ?? randomBytes(32).toString('base64url');
  const backup = resolve(root, `tmp/local-dev/internal-config-${Date.now()}`);
  mkdirSync(backup, { recursive: true });
  for (const [index, path] of paths.entries()) {
    let source = readFileSync(path, 'utf8');
    writeFileSync(resolve(backup, `${index === 0 ? 'sams' : 'aps'}.env`), source, { flag: 'wx', mode: 0o600 });
    const values = { SAMS_INTERNAL_ENABLED: 'true', SAMS_INTERNAL_SERVICE_KEY: key, ...(index === 0
      ? { SAMS_INTERNAL_HOST: '127.0.0.1', SAMS_INTERNAL_PORT: '3003', SAMS_INTERNAL_ALLOW_NETWORK: 'false' }
      : { SAMS_INTERNAL_BASE_URL: 'http://127.0.0.1:3003/internal/v1', SAMS_INTERNAL_TIMEOUT_MS: '8000' }) };
    for (const [name, value] of Object.entries(values)) {
      const pattern = new RegExp(`^\\s*(?:export\\s+)?${name}=.*$`, 'm');
      source = pattern.test(source) ? source.replace(pattern, `${name}=${value}`) : `${source.trimEnd()}\n${name}=${value}\n`;
    }
    writeFileSync(path, source, { mode: 0o600 });
  }
  console.log('PASS configured matching internal-read credentials in ignored local API env files. Previous files backed up under ignored tmp/local-dev.');
  console.log('No passwords or signing keys changed. Restart npm run dev:iskool. Local hosted-database allowance: 8s/request; deployed default remains 2s.');
} catch (error) {
  console.error(`BLOCKED: ${error.message}`);
  process.exitCode = 1;
}
