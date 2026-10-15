import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnvFile(path) {
  const envPath = resolve(path);
  if (!existsSync(envPath)) {
    return;
  }

  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const index = line.indexOf('=');
    if (index <= 0) {
      continue;
    }

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function loadServiceEnv(serviceName) {
  loadEnvFile('.env');
  loadEnvFile(`apps/${serviceName}/.env`);
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function boolEnv(name) {
  return ['1', 'true', 'yes'].includes((process.env[name] ?? '').toLowerCase());
}
