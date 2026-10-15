import { generateKeyPairSync } from 'node:crypto';
import { JwtTokenService } from './jwt-token.service';
import { PasswordService, testPasswordHashOptions } from './password.service';
import { RefreshTokenService } from './refresh-token.service';

function generateRsaKeys(): { privateKeyPem: string; publicKeyPem: string; keyId: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  return { privateKeyPem: privateKey, publicKeyPem: publicKey, keyId: 'test-key' };
}

describe('RefreshTokenService', () => {
  it('generates high-entropy opaque tokens and stable SHA-256 digests', () => {
    const service = new RefreshTokenService();
    const first = service.generate();
    const second = service.generate();

    expect(first.token).not.toBe(second.token);
    expect(first.token.length).toBeGreaterThanOrEqual(43);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(service.digest(first.token)).toBe(first.digest);
  });
});

describe('PasswordService', () => {
  it('hashes passwords with Argon2id and verifies without storing plaintext', async () => {
    const service = new PasswordService(testPasswordHashOptions);
    const hash = await service.hash('correct horse battery staple');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(service.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong password')).resolves.toBe(false);
  });
});

describe('JwtTokenService', () => {
  it('signs and verifies a service-scoped APS access token', async () => {
    const keys = generateRsaKeys();
    const service = new JwtTokenService({ scope: 'aps', accessTtlSeconds: 900, keys });

    const signed = await service.signAccessToken({
      userId: 'user-1',
      schoolId: 'school-1',
      membershipId: 'membership-1',
      sessionId: 'session-1',
      scope: 'aps',
      roles: ['teacher']
    });

    const principal = await service.verifyAccessToken(signed.token);

    expect(principal).toEqual({
      userId: 'user-1',
      schoolId: 'school-1',
      membershipId: 'membership-1',
      sessionId: 'session-1',
      scope: 'aps',
      roles: ['teacher'],
      tokenId: signed.tokenId
    });
  });

  it('rejects an APS token against the SAMS verifier', async () => {
    const keys = generateRsaKeys();
    const aps = new JwtTokenService({ scope: 'aps', accessTtlSeconds: 900, keys });
    const sams = new JwtTokenService({ scope: 'sams', accessTtlSeconds: 900, keys });

    const signed = await aps.signAccessToken({
      userId: 'user-1',
      schoolId: 'school-1',
      membershipId: 'membership-1',
      sessionId: 'session-1',
      scope: 'aps',
      roles: []
    });

    await expect(sams.verifyAccessToken(signed.token)).rejects.toThrow('Invalid authentication token.');
  });
});
