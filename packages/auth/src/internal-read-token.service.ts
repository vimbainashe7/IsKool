import { randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { AuthenticationTokenError } from './jwt-token.service';

const issuer = 'iskool:aps:internal';
const audience = 'iskool:sams:internal';
const scope = 'sams:context:read';

/** Separate service credentials authorize reads; they never supply actor identity. */
export class InternalReadTokenService {
  private readonly secret: Uint8Array;
  constructor(secret: Uint8Array) {
    if (secret.length < 32 || secret.length > 64) {
      throw new Error(
        'Internal reads require separate 256-bit service key material.'
      );
    }
    this.secret = secret.slice();
  }
  async sign(): Promise<string> {
    return new SignJWT({ scope })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('aps-api')
      .setIssuedAt()
      .setExpirationTime('45s')
      .setJti(randomUUID())
      .sign(this.secret);
  }
  async verify(
    token: string
  ): Promise<{ clientId: 'aps-api'; scope: 'sams:context:read' }> {
    try {
      if (token.length > 2048) throw new AuthenticationTokenError();
      const { payload, protectedHeader } = await jwtVerify(token, this.secret, {
        issuer,
        audience,
        algorithms: ['HS256'],
        maxTokenAge: '60s'
      });
      if (
        protectedHeader.typ !== 'JWT' ||
        payload.sub !== 'aps-api' ||
        payload.scope !== scope ||
        typeof payload.jti !== 'string' ||
        !payload.jti ||
        typeof payload.exp !== 'number' ||
        typeof payload.iat !== 'number' ||
        payload.exp - payload.iat > 60 ||
        payload.exp <= payload.iat
      ) {
        throw new AuthenticationTokenError();
      }
      return { clientId: 'aps-api', scope };
    } catch {
      throw new AuthenticationTokenError('Invalid internal read credential.');
    }
  }
}
