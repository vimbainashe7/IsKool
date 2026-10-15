import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.SERVICE_NAME = process.env.SERVICE_NAME ?? 'aps-api';
process.env.PORT = process.env.PORT ?? '3001';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? '';
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'aps-api';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'aps';
process.env.JWT_SCOPE = process.env.JWT_SCOPE ?? 'aps';
process.env.JWT_PRIVATE_KEY_PEM = process.env.JWT_PRIVATE_KEY_PEM ?? privateKey;
process.env.JWT_PUBLIC_KEY_PEM = process.env.JWT_PUBLIC_KEY_PEM ?? publicKey;
process.env.JWT_KEY_ID = process.env.JWT_KEY_ID ?? 'aps-test-key';
process.env.JWT_ACCESS_TTL_SECONDS = process.env.JWT_ACCESS_TTL_SECONDS ?? '900';
process.env.JWT_REFRESH_TTL_SECONDS = process.env.JWT_REFRESH_TTL_SECONDS ?? '1209600';
process.env.AUTH_DATABASE_URL = process.env.AUTH_DATABASE_URL ?? process.env.DATABASE_URL;
process.env.SAMS_INTERNAL_BASE_URL =
  process.env.SAMS_INTERNAL_BASE_URL ?? 'http://localhost:3002/api/v1/internal';
process.env.STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
process.env.STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? 'aps-local';
process.env.STORAGE_REGION = process.env.STORAGE_REGION ?? 'us-east-1';
process.env.STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY ?? 'minioadmin';
process.env.STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY ?? 'minioadmin123';
process.env.STORAGE_FORCE_PATH_STYLE = process.env.STORAGE_FORCE_PATH_STYLE ?? 'true';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';
