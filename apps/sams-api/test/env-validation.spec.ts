import { envValidationSchema } from '../src/config/env.validation';

describe('env validation', () => {
  const validEnv = {
    NODE_ENV: 'development',
    SERVICE_NAME: 'sams-api',
    PORT: 3002,
    DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: '',
    JWT_ISSUER: 'sams-api',
    JWT_AUDIENCE: 'sams',
    JWT_SCOPE: 'sams',
    JWT_PRIVATE_KEY_PEM: 'test-private-key',
    JWT_PUBLIC_KEY_PEM: 'test-public-key',
    JWT_KEY_ID: 'sams-test-key',
    APS_JWT_PRIVATE_KEY_PEM: 'test-aps-private-key',
    APS_JWT_PUBLIC_KEY_PEM: 'test-aps-public-key',
    APS_JWT_KEY_ID: 'aps-test-key',
    JWT_ACCESS_TTL_SECONDS: 900,
    JWT_REFRESH_TTL_SECONDS: 1209600,
    AUTH_DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_BUCKET: 'sams-local',
    STORAGE_REGION: 'us-east-1',
    STORAGE_ACCESS_KEY: 'minioadmin',
    STORAGE_SECRET_KEY: 'minioadmin123',
    STORAGE_FORCE_PATH_STYLE: true,
    ALLOWED_ORIGINS: 'http://localhost:5174',
    LOG_LEVEL: 'debug'
  };

  it('accepts valid local config', () => {
    const result = envValidationSchema.validate(validEnv);
    expect(result.error).toBeUndefined();
  });

  it('fails invalid production config', () => {
    const result = envValidationSchema.validate({ ...validEnv, NODE_ENV: 'production' });
    expect(result.error).toBeDefined();
  });
});
