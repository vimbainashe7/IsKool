import { randomBytes } from 'node:crypto';
import { SignJWT } from 'jose';
import { InternalReadTokenService } from './internal-read-token.service';

describe('APS to SAMS read credential', () => {
  const secret = randomBytes(32);
  it('authenticates only the APS read client with its own credential', async () => {
    const service = new InternalReadTokenService(secret);
    const token = await service.sign();
    await expect(service.verify(token)).resolves.toEqual({
      clientId: 'aps-api',
      scope: 'sams:context:read'
    });
    await expect(
      new InternalReadTokenService(randomBytes(32)).verify(token)
    ).rejects.toThrow();
  });
  it('rejects missing scope, expired credentials and excessive lifetimes', async () => {
    const now = Math.floor(Date.now() / 1000);
    for (const [scope, expires] of [
      ['sams:write', now + 30],
      ['sams:context:read', now - 1],
      ['sams:context:read', now + 3600]
    ] as const) {
      const token = await new SignJWT({ scope })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer('iskool:aps:internal')
        .setAudience('iskool:sams:internal')
        .setSubject('aps-api')
        .setIssuedAt(now)
        .setExpirationTime(expires)
        .setJti('test-request')
        .sign(secret);
      await expect(
        new InternalReadTokenService(secret).verify(token)
      ).rejects.toThrow();
    }
    await expect(
      new InternalReadTokenService(secret).verify('not-a-service-token')
    ).rejects.toThrow();
  });
  it('requires at least 256 bits of separate service key material', () => {
    expect(() => new InternalReadTokenService(new Uint8Array(8))).toThrow();
  });
});
