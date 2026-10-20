import { registerAs } from '@nestjs/config';

export const samsInternalConfig = registerAs('samsInternal', () => ({
  baseUrl: process.env.SAMS_INTERNAL_BASE_URL,
  enabled: process.env.SAMS_INTERNAL_ENABLED === 'true',
  serviceKey: process.env.SAMS_INTERNAL_SERVICE_KEY,
  timeoutMs: Number(process.env.SAMS_INTERNAL_TIMEOUT_MS ?? 2000),
  environment: process.env.NODE_ENV
}));
