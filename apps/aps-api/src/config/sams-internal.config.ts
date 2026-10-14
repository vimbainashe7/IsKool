import { registerAs } from '@nestjs/config';

export const samsInternalConfig = registerAs('samsInternal', () => ({
  baseUrl: process.env.SAMS_INTERNAL_BASE_URL
}));
