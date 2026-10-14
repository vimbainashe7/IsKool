import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
  scope: process.env.JWT_SCOPE,
  accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS),
  refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS)
}));
