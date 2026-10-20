import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { InternalReadTokenService, JwtTokenService } from '@aps-sams/auth';
import { JsonLogger } from '../../../common/logging/logger.service';
import { RequestContextInterceptor } from '../../../common/interceptors/request-context.interceptor';
import { InternalReadGuard } from '../internal-read.guard';
import { AuthRepository } from '../../auth/auth.repository';
import { InternalReadService } from '../internal-read.service';
import { InternalReadLifecycle } from '../internal-read.module';
import { startInternalReads } from '../internal-read.server';
const keys = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  }),
  secret = randomBytes(32);
const actor = {
  userId: 'a2000000-0000-4000-8000-000000000004',
  schoolId: 'a1000000-0000-4000-8000-000000000001',
  membershipId: 'a3000000-0000-4000-8000-000000000004',
  sessionId: 'a9000000-0000-4000-8000-000000000004',
  scope: 'aps' as const,
  roles: ['student']
};
describe('private internal HTTP contract', () => {
  const lifecycle = new InternalReadLifecycle();
  let base: string, authorization: string, actorToken: string;
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  };
  const config = new ConfigService({
    SAMS_INTERNAL_ENABLED: true,
    SAMS_INTERNAL_SERVICE_KEY: secret.toString('base64url'),
    SAMS_INTERNAL_HOST: '127.0.0.1',
    SAMS_INTERNAL_PORT: 0,
    APS_JWT_PUBLIC_KEY_PEM: keys.publicKey,
    APS_JWT_KEY_ID: 'actor'
  });
  const auth = { validatePrincipal: jest.fn(async (p) => p) };
  const guard = new InternalReadGuard(config, auth as never);
  const reads = new InternalReadService({
    run: async (_p: unknown, _r: unknown, work: (tx: unknown) => unknown) =>
      work({}),
    ownProfile: async () => null,
    context: async () => ({
      authorized: true,
      asOf: new Date(),
      classes: [],
      totalClasses: 0
    })
  } as never);
  const providers = new Map<unknown, unknown>([
    [ConfigService, config],
    [AuthRepository, auth],
    [InternalReadGuard, guard],
    [InternalReadService, reads],
    [InternalReadLifecycle, lifecycle],
    [JsonLogger, logger],
    [RequestContextInterceptor, new RequestContextInterceptor(logger as never)]
  ]);
  beforeAll(async () => {
    await startInternalReads({
      get: (type: unknown) => providers.get(type)
    } as never);
    const address = lifecycle.server!.getHttpServer().address();
    base = `http://127.0.0.1:${address.port}/internal/v1`;
    authorization = `Bearer ${await new InternalReadTokenService(secret).sign()}`;
    actorToken = (
      await new JwtTokenService({
        scope: 'aps',
        accessTtlSeconds: 60,
        keys: {
          privateKeyPem: keys.privateKey,
          publicKeyPem: keys.publicKey,
          keyId: 'actor'
        }
      }).signAccessToken(actor)
    ).token;
  });
  afterAll(async () => {
    await lifecycle.onApplicationShutdown();
  });
  it('requires both credentials and propagates correlation IDs even on authentication errors', async () => {
    const response = await fetch(`${base}/context?role=student`, {
      headers: { 'x-request-id': 'boundary-denied' }
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('x-request-id')).toBe('boundary-denied');
    expect((await response.json()).error.requestId).toBe('boundary-denied');
    const missingActor = await fetch(`${base}/context?role=student`, {
      headers: { authorization }
    });
    expect(missingActor.status).toBe(401);
    await missingActor.body?.cancel();
  });
  it('serves a validated authorized context and rejects actor/tenant filter injection', async () => {
    const headers = {
      authorization,
      'x-iskool-actor-token': actorToken,
      'x-request-id': 'boundary-allowed'
    };
    const response = await fetch(`${base}/context?role=student&limit=2`, {
      headers
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({
      version: 1,
      schoolId: actor.schoolId,
      membershipId: actor.membershipId,
      classes: [],
      totalClasses: 0
    });
    const invalid = await fetch(
      `${base}/context?role=student&schoolId=foreign`,
      { headers }
    );
    expect(invalid.status).toBe(400);
    await invalid.body?.cancel();
    const mutation = await fetch(`${base}/context?role=student`, {
      method: 'POST',
      headers
    });
    expect(mutation.status).toBe(404);
    await mutation.body?.cancel();
  });
  it('refuses an off-loopback listener without an explicit network opt-in', async () => {
    const unsafe = new ConfigService({
      SAMS_INTERNAL_ENABLED: true,
      SAMS_INTERNAL_HOST: '0.0.0.0'
    });
    await expect(
      startInternalReads({ get: () => unsafe } as never)
    ).rejects.toThrow('private-network');
  });
});
