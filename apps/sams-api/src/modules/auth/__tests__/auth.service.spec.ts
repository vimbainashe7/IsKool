import { generateKeyPairSync } from 'node:crypto';
import { AuthService } from '../auth.service';
import { AuthRepository } from '../auth.repository';
import { ServiceAccessPolicy } from '../service-access.policy';
import { PasswordService, testPasswordHashOptions } from '@aps-sams/auth';

function generateKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  return { privateKey, publicKey };
}

describe('AuthService', () => {
  async function createHarness() {
    const keys = generateKeys();
    const apsKeys = generateKeys();
    const passwordHash = await new PasswordService(testPasswordHashOptions).hash('correct-password');
    const repository = {
      findLoginCandidate: jest.fn(),
      createLoginContinuation: jest.fn(async () => ({ id: 'continuation-1', expiresAt: new Date(Date.now() + 300000) })),
      rotateRefreshToken: jest.fn(),
      revokeSession: jest.fn(),
      createSession: jest.fn(async () => ({
        sessionId: 'session-1',
        refreshToken: '',
        refreshTokenId: 'refresh-1'
      }))
    } as unknown as jest.Mocked<AuthRepository>;
    const service = new AuthService(
      {
        issuer: 'sams-api',
        audience: 'sams',
        scope: 'sams',
        privateKeyPem: keys.privateKey,
        publicKeyPem: keys.publicKey,
        keyId: 'test-key',
        apsPrivateKeyPem: apsKeys.privateKey,
        apsPublicKeyPem: apsKeys.publicKey,
        apsKeyId: 'aps-test-key',
        accessTtlSeconds: 900,
        refreshTtlSeconds: 1209600,
        authDatabaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
      },
      repository,
      new ServiceAccessPolicy()
    );

    return { service, repository, passwordHash };
  }

  function candidate(passwordHash: string, roles = ['registrar']) {
    return {
      id: 'user-1',
      email: 'registrar@example.test',
      displayName: 'Registrar',
      status: 'active',
      passwordHash,
      credentialDisabledAt: null,
      activeMemberships: [
        {
          id: 'membership-1',
          schoolId: 'school-1',
          schoolName: 'School One',
          roles: roles.map((key) => ({ key }))
        }
      ]
    };
  }

  it('issues a SAMS access token and refresh token for a valid single-school login', async () => {
    const { service, repository, passwordHash } = await createHarness();
    repository.findLoginCandidate.mockResolvedValue(candidate(passwordHash));

    const response = await service.login({ email: ' Registrar@Example.Test ', password: 'correct-password' });

    expect('accessTokens' in response).toBe(true);
    if ('accessTokens' in response) {
      expect(response.accessTokens.sams).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.roles).toEqual(['registrar']);
      expect(response.allowedScopes).toEqual(['sams']);
    }
    expect(repository.findLoginCandidate).toHaveBeenCalledWith('registrar@example.test');
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        schoolId: 'school-1',
        membershipId: 'membership-1',
        allowedScopes: ['sams']
      })
    );
  });

  it('uses the same public error for unknown users and wrong passwords', async () => {
    const { service, repository, passwordHash } = await createHarness();
    repository.findLoginCandidate.mockResolvedValueOnce(null);
    await expect(service.login({ email: 'missing@example.test', password: 'wrong-password' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Invalid credentials.'
    });

    repository.findLoginCandidate.mockResolvedValueOnce(candidate(passwordHash));
    await expect(service.login({ email: 'registrar@example.test', password: 'wrong-password' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Invalid credentials.'
    });
  });

  it('requires explicit school selection when multiple active memberships exist', async () => {
    const { service, repository, passwordHash } = await createHarness();
    repository.findLoginCandidate.mockResolvedValue({
      ...candidate(passwordHash),
      activeMemberships: [
        { id: 'membership-1', schoolId: 'school-1', schoolName: 'School One', roles: [{ key: 'registrar' }] },
        { id: 'membership-2', schoolId: 'school-2', schoolName: 'School Two', roles: [{ key: 'finance' }] }
      ]
    });

    const response = await service.login({ email: 'registrar@example.test', password: 'correct-password' });

    expect(response).toMatchObject({
      status: 'SCHOOL_SELECTION_REQUIRED',
      schools: [
        { id: 'school-1', roles: ['registrar'], allowedScopes: ['sams'] },
        { id: 'school-2', roles: ['finance'], allowedScopes: ['sams'] }
      ]
    });
    expect(repository.createLoginContinuation).toHaveBeenCalled();
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects a selected school that is not an active membership for the user', async () => {
    const { service, repository, passwordHash } = await createHarness();
    repository.findLoginCandidate.mockResolvedValue(candidate(passwordHash));

    await expect(
      service.login({ email: 'registrar@example.test', password: 'correct-password', schoolId: 'school-2' })
    ).rejects.toMatchObject({
      code: 'SCHOOL_CONTEXT_DENIED'
    });
  });

  it('issues only an APS access token for APS-only roles', async () => {
    const { service, repository, passwordHash } = await createHarness();
    repository.findLoginCandidate.mockResolvedValue(candidate(passwordHash, ['student']));

    const response = await service.login({ email: 'student@example.test', password: 'correct-password' });

    expect('accessTokens' in response).toBe(true);
    if ('accessTokens' in response) {
      expect(response.accessTokens.aps).toBeDefined();
      expect(response.accessTokens.sams).toBeUndefined();
      expect(response.allowedScopes).toEqual(['aps']);
    }
  });

  it('rotates refresh tokens and issues a new SAMS access token', async () => {
    const { service, repository } = await createHarness();
    repository.rotateRefreshToken.mockResolvedValue({
      sessionId: 'session-1',
      userId: 'user-1',
      schoolId: 'school-1',
      membershipId: 'membership-1',
      roles: ['registrar'],
      allowedScopes: ['sams']
    });

    const response = await service.refresh({ refreshToken: 'r'.repeat(43) });

    expect(response.accessToken).toBeDefined();
    expect(response.accessTokens.sams).toBeDefined();
    expect(response.refreshToken).toBeDefined();
    expect(response.refreshToken).not.toBe('r'.repeat(43));
    expect(repository.rotateRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        successorDigest: expect.stringMatching(/^[a-f0-9]{64}$/)
      })
    );
  });

  it('rejects reused refresh tokens with the standard auth error', async () => {
    const { service, repository } = await createHarness();
    repository.rotateRefreshToken.mockResolvedValue('reused');

    await expect(service.refresh({ refreshToken: 'r'.repeat(43) })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Invalid refresh session.'
    });
  });

  it('revokes the current session on logout', async () => {
    const { service, repository } = await createHarness();

    await expect(service.logout('session-1')).resolves.toEqual({ status: 'LOGGED_OUT' });
    expect(repository.revokeSession).toHaveBeenCalledWith('session-1', 'logout');
  });
});
