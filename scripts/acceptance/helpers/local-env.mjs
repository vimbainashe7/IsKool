import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

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
