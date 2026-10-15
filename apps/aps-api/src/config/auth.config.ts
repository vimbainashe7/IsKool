import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  issuer: process.env.JWT_ISSUER,
  audience: process.env.JWT_AUDIENCE,
  scope: process.env.JWT_SCOPE,
  privateKeyPem: process.env.JWT_PRIVATE_KEY_PEM,
  publicKeyPem: process.env.JWT_PUBLIC_KEY_PEM,
  keyId: process.env.JWT_KEY_ID,
  accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS),
  refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS),
  authDatabaseUrl: process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL
}));
