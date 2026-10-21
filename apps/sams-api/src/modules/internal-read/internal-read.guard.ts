import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthPrincipal,
  InternalReadTokenService,
  JwtTokenService
} from '@aps-sams/auth';
import { AuthenticationRequiredError } from '../../common/errors/application-error';
import { AuthRepository } from '../auth/auth.repository';
import { AuthenticatedRequest } from '../auth/request-auth-principal';
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class InternalReadGuard implements CanActivate {
  private readonly credentials?: InternalReadTokenService;
  private readonly actors?: JwtTokenService;
  constructor(
    config: ConfigService,
    private readonly identities: AuthRepository
  ) {
    const key = config.get<string>('SAMS_INTERNAL_SERVICE_KEY');
    if (!key) return;
    if (!/^[A-Za-z0-9_-]{43,86}$/.test(key))
      throw new Error(
        'SAMS_INTERNAL_SERVICE_KEY must contain separate base64url key material.'
      );
    this.credentials = new InternalReadTokenService(
      Buffer.from(key, 'base64url')
    );
    this.actors = new JwtTokenService({
      scope: 'aps',
      accessTtlSeconds: 60,
      keys: {
        privateKeyPem: '',
        publicKeyPem: config.getOrThrow<string>('APS_JWT_PUBLIC_KEY_PEM'),
        keyId: config.getOrThrow<string>('APS_JWT_KEY_ID')
      }
    });
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    const actor = request.header('x-iskool-actor-token');
    let verified: AuthPrincipal;
    try {
      if (
        !this.credentials ||
        !this.actors ||
        !authorization?.startsWith('Bearer ') ||
        !actor ||
        actor.length > 8192
      )
        throw new Error();
      await this.credentials.verify(authorization.slice(7));
      verified = await this.actors.verifyAccessToken(actor);
      if (
        ![
          verified.userId,
          verified.membershipId,
          verified.schoolId,
          verified.sessionId
        ].every((id) => uuid.test(id))
      )
        throw new Error();
    } catch {
      throw new AuthenticationRequiredError(
        'Internal read authentication is required.'
      );
    }
    // Session and membership/role state are independently revalidated by SAMS.
    // A database outage must remain a dependency error, never invalid credentials.
    const principal = await this.identities.validatePrincipal(verified);
    if (!principal) throw new AuthenticationRequiredError();
    request.authPrincipal = principal;
    request.user = { sub: principal.userId };
    return true;
  }
}
