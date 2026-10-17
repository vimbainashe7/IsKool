import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadEnvFile } from './helpers/env.mjs';

const inherited = { ...process.env };
const secrets = new Set();
for (const file of ['.env', 'apps/aps-api/.env', 'apps/sams-api/.env', 'frontend_base/.env.local']) {
  process.env = { ...inherited };
  loadEnvFile(file);
  for (const [key, value] of Object.entries(process.env)) {
    if (!value || value.length < 9 || !/(PASSWORD|PRIVATE_KEY(?:_PEM)?|DATABASE_URL|AI_API_KEY|SERVICE_ROLE_KEY)$/.test(key)) continue;
    secrets.add(value);
    secrets.add(value.replace(/\\n/g, '\n'));
    if (key.endsWith('DATABASE_URL')) {
      try { const password = decodeURIComponent(new URL(value).password); if (password.length > 8) secrets.add(password); } catch { /* not a URL */ }
    }
  }
}
process.env = inherited;
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
let count = 0;
const failures = new Set();
function inspect(file, content) {
  count++;
  if ([...secrets].some((secret) => content.includes(secret))) failures.add(file);
}
for (const file of tracked) {
  if (/\.(?:[cm]?[jt]sx?|json|md|ya?ml|sql|ps1|toml|example|txt)$/.test(file) && existsSync(file)) inspect(file, readFileSync(file, 'utf8'));
}
// Include staged additions, even when they are not yet part of HEAD.
inspect('staged diff', execFileSync('git', ['diff', '--cached', '--no-ext-diff'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
function assets(directory) {
  if (!existsSync(directory)) throw new Error('Build the frontend before scanning browser assets.');
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) assets(file);
    else if (/\.(js|map)$/.test(file)) inspect(file, readFileSync(file, 'utf8'));
  }
}
assets('frontend_base/.next/static');
if (failures.size) {
  console.error(`FAIL configured private value found in: ${[...failures].join(', ')} (values withheld)`);
  process.exitCode = 1;
} else console.log(`PASS ${count} tracked text files/staged diff/browser assets scanned against configured private values; no secret values printed.`);
