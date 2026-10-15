import { existsSync } from 'node:fs';

export const defaultSamsBaseUrl = process.env.SAMS_BASE_URL ?? 'http://127.0.0.1:3002/api/v1';
export const defaultApsBaseUrl = process.env.APS_BASE_URL ?? 'http://127.0.0.1:3001/api/v1';

export function prismaClientGenerated() {
  return existsSync('node_modules/@prisma/client/index.js');
}

export function assertPrismaClientGenerated() {
  if (!prismaClientGenerated()) {
    throw new Error('Prisma Client is not generated. Run npm ci, then npm run prisma:generate.');
  }
}

export async function healthCheck(label, baseUrl, timeoutMs = 1500) {
  const url = `${baseUrl}/health/live`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { label, url, ok: response.ok, status: response.status };
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
