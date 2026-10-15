import { randomUUID } from 'node:crypto';
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose';
import { AuthPrincipal, AuthTokenClaims } from './principal';
import { isServiceScope, ServiceScope, serviceTokenProfiles } from './service-scope';

const algorithm = 'RS256';

export interface ServiceTokenKeys {
  readonly privateKeyPem: string;
  readonly publicKeyPem: string;
  readonly keyId: string;
}

export interface TokenEngineConfig {
  readonly scope: ServiceScope;
  readonly accessTtlSeconds: number;
  readonly keys: ServiceTokenKeys;
}

export class AuthenticationTokenError extends Error {
  constructor(message = 'Invalid authentication token.') {
    super(message);
  }
}

export class JwtTokenService {
  private readonly profile;

  constructor(private readonly config: TokenEngineConfig) {
    this.profile = serviceTokenProfiles[this.config.scope];
  }

  async signAccessToken(input: Omit<AuthPrincipal, 'tokenId'>): Promise<{ token: string; tokenId: string }> {
    const tokenId = randomUUID();
    const privateKey = await importPKCS8(normalizePem(this.config.keys.privateKeyPem), algorithm);

    const token = await new SignJWT({
      sid: input.sessionId,
      school_id: input.schoolId,
      membership_id: input.membershipId,
      scope: input.scope,
      roles: [...input.roles]
    } satisfies Omit<AuthTokenClaims, 'sub' | 'jti'>)
      .setProtectedHeader({ alg: algorithm, kid: this.config.keys.keyId, typ: 'JWT' })
      .setSubject(input.userId)
      .setIssuer(this.profile.issuer)
      .setAudience(this.profile.audience)
      .setJti(tokenId)
      .setIssuedAt()
      .setExpirationTime(`${this.config.accessTtlSeconds}s`)
      .sign(privateKey);

    return { token, tokenId };
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal> {
    const publicKey = await importSPKI(normalizePem(this.config.keys.publicKeyPem), algorithm);
    try {
      const result = await jwtVerify(token, publicKey, {
        issuer: this.profile.issuer,
        audience: this.profile.audience,
        algorithms: [algorithm]
      });

      const payload = result.payload;
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        typeof payload.school_id !== 'string' ||
        typeof payload.membership_id !== 'string' ||
        typeof payload.jti !== 'string' ||
        !isServiceScope(payload.scope) ||
        payload.scope !== this.profile.scope
      ) {
        throw new AuthenticationTokenError();
      }

      const roles = Array.isArray(payload.roles) ? payload.roles.filter((role): role is string => typeof role === 'string') : [];

      return {
        userId: payload.sub,
        schoolId: payload.school_id,
        membershipId: payload.membership_id,
        sessionId: payload.sid,
        scope: payload.scope,
        roles,
        tokenId: payload.jti
      };
    } catch (error) {
      if (error instanceof AuthenticationTokenError) {
        throw error;
      }
      throw new AuthenticationTokenError();
    }
  }
}

export function normalizePem(value: string): string {
  return value.replace(/\\n/g, '\n').trim();
}
