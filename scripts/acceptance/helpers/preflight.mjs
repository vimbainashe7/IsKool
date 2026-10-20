import { existsSync } from 'node:fs';

export const defaultSamsBaseUrl = process.env.SAMS_BASE_URL ?? 'http://127.0.0.1:3002/api/v1';
export const defaultApsBaseUrl = process.env.APS_BASE_URL ?? 'http://127.0.0.1:3001/api/v1';

export function prismaClientGenerated() {
  return existsSync('node_modules/.prisma/client/index.js');
}

export function samePrismaSchema(left, right) {
  // Prisma aligns fields while generating. Compare tokens, preserving spaces
  // inside quoted defaults rather than treating formatting as stale generation.
  const tokens = (source) => source.match(/"(?:\\.|[^"\\])*"|[A-Za-z_]\w*|\d+(?:\.\d+)?|[^\s]/g)?.join('\0');
  return tokens(left) === tokens(right);
}

export function assertPrismaClientGenerated() {
  if (!prismaClientGenerated()) {
    throw new Error('Prisma Client is not generated. Run npm ci, then npm run prisma:generate.');
  }
}

export async function healthCheck(label, baseUrl, timeoutMs = 5000) {
  const url = `${baseUrl}/health/ready`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.json();
    return { label, url, ok: response.ok && body.status === 'ok' && body.dependencies?.database === 'ok' && ['ok', 'disabled'].includes(body.dependencies?.redis), status: response.status };
  } catch (error) {
    return {
      label,
      url,
      ok: false,
      status: 'DOWN',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function assertHealthyApis() {
  const [sams, aps] = await Promise.all([
    healthCheck('SAMS API', defaultSamsBaseUrl),
    healthCheck('APS API', defaultApsBaseUrl)
  ]);

  const failures = [sams, aps].filter((result) => !result.ok);
  if (failures.length === 0) {
    return { sams, aps };
  }

  for (const failure of failures) {
    console.error(`FAIL ${failure.label} is not running at ${failure.url}.`);
  }
  console.error('Start both services with npm run dev:backend and wait for health before running smoke tests.');
  throw new Error('API health preflight failed.');
}
