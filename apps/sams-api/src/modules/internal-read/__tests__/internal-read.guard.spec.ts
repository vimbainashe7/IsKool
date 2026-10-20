import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { InternalReadTokenService, JwtTokenService } from '@aps-sams/auth';
import { InternalReadGuard } from '../internal-read.guard';
const keys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});
const secret = randomBytes(32);
const actor = {
  userId: 'a2000000-0000-4000-8000-000000000003',
  membershipId: 'a3000000-0000-4000-8000-000000000003',
  schoolId: 'a1000000-0000-4000-8000-000000000001',
  sessionId: 'a9000000-0000-4000-8000-000000000003',
  scope: 'aps' as const,
  roles: ['admin']
};
const jwt = new JwtTokenService({
  scope: 'aps',
  accessTtlSeconds: 60,
  keys: {
    privateKeyPem: keys.privateKey,
    publicKeyPem: keys.publicKey,
    keyId: 'actor'
  }
});
function setup(headers: Record<string, string>) {
  const request = {
    header: (name: string) => headers[name],
    authPrincipal: undefined
  };
  const repository = {
    validatePrincipal: jest
      .fn()
      .mockImplementation(async (p) => ({ ...p, roles: ['teacher'] }))
  };
  const guard = new InternalReadGuard(
    new ConfigService({
      SAMS_INTERNAL_SERVICE_KEY: secret.toString('base64url'),
      APS_JWT_PUBLIC_KEY_PEM: keys.publicKey,
      APS_JWT_KEY_ID: 'actor'
    }),
    repository as never
  );
  return {
    request,
    repository,
    guard,
    context: { switchToHttp: () => ({ getRequest: () => request }) } as never
  };
}
describe('private SAMS dual authentication', () => {
  it('denies missing service credentials before validating an actor', async () => {
    const { guard, repository, context } = setup({});
    await expect(guard.canActivate(context)).rejects.toThrow();
    expect(repository.validatePrincipal).not.toHaveBeenCalled();
  });
  it('requires the service credential and a real actor token, then replaces stale token roles', async () => {
    const token = await jwt.signAccessToken(actor);
    const { guard, request, context } = setup({
      authorization: `Bearer ${await new InternalReadTokenService(secret).sign()}`,
      'x-iskool-actor-token': token.token
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.authPrincipal).toEqual(
      expect.objectContaining({
        schoolId: actor.schoolId,
        membershipId: actor.membershipId,
        roles: ['teacher']
      })
    );
  });
  it('fails closed for invalid actors and revoked sessions/memberships', async () => {
    const authorization = `Bearer ${await new InternalReadTokenService(secret).sign()}`;
    const invalid = setup({ authorization, 'x-iskool-actor-token': 'invalid' });
    await expect(invalid.guard.canActivate(invalid.context)).rejects.toThrow();
    expect(invalid.repository.validatePrincipal).not.toHaveBeenCalled();
    const token = await jwt.signAccessToken(actor);
    const disabled = setup({
      authorization,
      'x-iskool-actor-token': token.token
    });
    disabled.repository.validatePrincipal.mockResolvedValueOnce(null);
    await expect(
      disabled.guard.canActivate(disabled.context)
    ).rejects.toThrow();
  });
});
