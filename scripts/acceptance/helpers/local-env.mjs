import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export function updateLocalEnv(source, values) {
  source = source.replace(/\r\n?/g, '\n');
  const before = parseEnv(source);
  let updated = source;
  for (const [name, value] of Object.entries(values)) {
    if (!/^[A-Z][A-Z_0-9]*$/.test(name) || !/^[A-Za-z0-9_:/.-]+$/.test(value)) throw new Error('Invalid managed development setting.');
    const pattern = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${name}=.*$`, 'm');
    updated = pattern.test(updated) ? updated.replace(pattern, () => `${name}=${value}`) : `${updated.trimEnd()}\n${name}=${value}\n`;
  }
  const after = parseEnv(updated);
  if (Object.entries(before).some(([key, value]) => !(key in values) && after[key] !== value) ||
      Object.entries(values).some(([key, value]) => after[key] !== value)) throw new Error('Development settings would change unrelated configuration; no file written.');
  return updated;
}

// Same precedence as the existing acceptance loader: inherited > root > service.
// Parsing never modifies process.env, including when Prisma loads its own .env.
export function readLocalEnv(files, inherited = process.env) {
  let env = { ...inherited };
  for (const file of files) {
    let source;
    try { source = readFileSync(file, 'utf8').replace(/^\uFEFF/, ''); } catch { throw new Error(`Missing local configuration: ${file}. Follow the root README.`); }
    const seen = new Set();
    for (const line of source.split(/\r?\n/)) {
      const key = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=/)?.[1];
      if (!key) continue;
      if (seen.has(key)) throw new Error(`Duplicate ${key} in ${file}; remove duplicate assignments before startup (values withheld).`);
      seen.add(key);
    }
    env = { ...parseEnv(source), ...env };
  }
  return env;
}
