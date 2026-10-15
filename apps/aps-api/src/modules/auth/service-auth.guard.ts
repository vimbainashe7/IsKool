import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { AuthenticationTokenError, JwtTokenService } from '@aps-sams/auth';
import { authConfig } from '../../config/auth.config';
import { AuthenticationRequiredError } from '../../common/errors/application-error';
import { AuthRepository } from './auth.repository';
import { AuthenticatedRequest } from './request-auth-principal';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  private readonly tokenService: JwtTokenService;

  constructor(
    @Inject(authConfig.KEY) config: ConfigType<typeof authConfig>,
    private readonly repository: AuthRepository
  ) {
    this.tokenService = new JwtTokenService({
      scope: 'aps',
      accessTtlSeconds: config.accessTtlSeconds,
      keys: {
        privateKeyPem: requireConfig(config.privateKeyPem, 'JWT_PRIVATE_KEY_PEM'),
        publicKeyPem: requireConfig(config.publicKeyPem, 'JWT_PUBLIC_KEY_PEM'),
        keyId: requireConfig(config.keyId, 'JWT_KEY_ID')
      }
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request.header('authorization'));
    if (!token) {
      throw new AuthenticationRequiredError();
    }

    try {
      const tokenPrincipal = await this.tokenService.verifyAccessToken(token);
      const principal = await this.repository.validatePrincipal(tokenPrincipal);
      if (!principal) {
        throw new AuthenticationRequiredError();
      }

      request.authPrincipal = principal;
      request.user = { sub: principal.userId };
      return true;
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) {
        throw error;
      }
      if (error instanceof AuthenticationTokenError) {
        throw new AuthenticationRequiredError();
      }
      throw error;
    }
  }
}

function bearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token || header.split(' ').length !== 2) {
    return null;
  }
  return token;
}

function requireConfig(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}
