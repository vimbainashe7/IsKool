import { generateKeyPairSync } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtTokenService } from '@aps-sams/auth';
import { AppModule } from '../../../app.module';
import { GlobalExceptionFilter } from '../../../common/filters/global-exception.filter';
import { RequestContextInterceptor } from '../../../common/interceptors/request-context.interceptor';
import { JsonLogger } from '../../../common/logging/logger.service';
import { AuthRepository } from '../auth.repository';

function generateKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  return { privateKey, publicKey };
}

describe('SAMS auth API', () => {
  let app: INestApplication;
  let repository: jest.Mocked<Pick<AuthRepository, 'validatePrincipal' | 'findSessionContext'>>;

  async function sign(scope: 'aps' | 'sams'): Promise<string> {
    const service = new JwtTokenService({
      scope,
      accessTtlSeconds: 900,
      keys: {
        privateKeyPem: process.env.JWT_PRIVATE_KEY_PEM!,
        publicKeyPem: process.env.JWT_PUBLIC_KEY_PEM!,
        keyId: `${scope}-test-key`
      }
    });

    const signed = await service.signAccessToken({
      userId: 'user-1',
      schoolId: 'school-1',
      membershipId: 'membership-1',
      sessionId: 'session-1',
      scope,
      roles: ['registrar']
    });

    return signed.token;
  }

  beforeAll(async () => {
    const keys = generateKeys();
    process.env.JWT_PRIVATE_KEY_PEM = keys.privateKey;
    process.env.JWT_PUBLIC_KEY_PEM = keys.publicKey;
    process.env.JWT_SCOPE = 'sams';
    process.env.JWT_ISSUER = 'sams-api';
    process.env.JWT_AUDIENCE = 'sams';

    repository = {
      validatePrincipal: jest.fn(),
      findSessionContext: jest.fn()
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthRepository)
      .useValue(repository)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(app.get(RequestContextInterceptor));
    app.useLogger(app.get(JsonLogger));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repository.validatePrincipal.mockReset();
    repository.findSessionContext.mockReset();
  });

  it('returns server-verified identity and school context for a SAMS token', async () => {
    const token = await sign('sams');
    const principal = {
      userId: 'user-1',
      schoolId: 'school-1',
      membershipId: 'membership-1',
      sessionId: 'session-1',
      scope: 'sams' as const,
      roles: ['admin'],
      tokenId: 'token-1'
    };
    repository.validatePrincipal.mockResolvedValue(principal);
    repository.findSessionContext.mockResolvedValue({
      user: { id: 'user-1', email: 'admin@example.test', displayName: 'Admin User' },
      school: { id: 'school-1', name: 'School One' },
      membershipId: 'membership-1',
      roles: ['admin']
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/context')
      .set('authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        user: { id: 'user-1', email: 'admin@example.test', displayName: 'Admin User' },
        school: { id: 'school-1', name: 'School One' },
        membershipId: 'membership-1',
        roles: ['admin']
      });
  });

  it('rejects an APS token at the SAMS HTTP boundary with 401', async () => {
    const token = await sign('aps');

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${token}`)
      .expect(401)
      .expect(({ body }) => {
        expect(body.error.code).toBe('UNAUTHORIZED');
        expect(body.error.status).toBe(401);
        expect(body.error.requestId).toBeDefined();
        expect(body.error.message).not.toContain('JWT');
      });

    expect(repository.validatePrincipal).not.toHaveBeenCalled();
  });
});
