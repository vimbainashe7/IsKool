import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  AuthPrincipal,
  JwtTokenService,
  PasswordService,
  RefreshTokenService,
  testPasswordHashOptions
} from '@aps-sams/auth';
import { authConfig } from '../../config/auth.config';
import { AuthenticationRequiredError, BusinessRuleError, ResourceNotFoundError } from '../../common/errors/application-error';
import { AuthRepository } from './auth.repository';
import { ActiveMembership, AuthSessionContext, LoginResponse, RefreshResponse, SchoolSelectionResponse } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ServiceAccessPolicy } from './service-access.policy';

const dummyPasswordHash =
  '$argon2id$v=19$m=4096,t=2,p=1$qktMOeOB8UvZcaw/rUZ/gg$X3Gh0qvAq5ghTNYL1kmZoTNnuZG+r4Lk4hEkS5fETb0';

@Injectable()
export class AuthService {
  private readonly passwordService: PasswordService;
  private readonly refreshTokenService = new RefreshTokenService();
  private readonly tokenServices: Record<'aps' | 'sams', JwtTokenService>;

  constructor(
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
    private readonly repository: AuthRepository,
    private readonly serviceAccessPolicy: ServiceAccessPolicy
  ) {
    this.passwordService = new PasswordService(process.env.NODE_ENV === 'test' ? testPasswordHashOptions : undefined);
    this.tokenServices = {
      aps: new JwtTokenService({
        scope: 'aps',
        accessTtlSeconds: config.accessTtlSeconds,
        keys: {
          privateKeyPem: requireConfig(config.apsPrivateKeyPem, 'APS_JWT_PRIVATE_KEY_PEM'),
          publicKeyPem: requireConfig(config.apsPublicKeyPem, 'APS_JWT_PUBLIC_KEY_PEM'),
          keyId: requireConfig(config.apsKeyId, 'APS_JWT_KEY_ID')
        }
      }),
      sams: new JwtTokenService({
        scope: 'sams',
        accessTtlSeconds: config.accessTtlSeconds,
        keys: {
          privateKeyPem: requireConfig(config.privateKeyPem, 'JWT_PRIVATE_KEY_PEM'),
          publicKeyPem: requireConfig(config.publicKeyPem, 'JWT_PUBLIC_KEY_PEM'),
          keyId: requireConfig(config.keyId, 'JWT_KEY_ID')
        }
      })
    };
  }

  async login(input: LoginDto): Promise<LoginResponse | SchoolSelectionResponse> {
    const emailNormalized = normalizeEmail(input.email);
    const candidate = await this.repository.findLoginCandidate(emailNormalized);
    const passwordHash = candidate?.passwordHash ?? dummyPasswordHash;
    const passwordValid = await this.passwordService.verify(passwordHash, input.password);

    if (
      !candidate ||
      !passwordValid ||
      candidate.status !== 'active' ||
      candidate.credentialDisabledAt !== null ||
      !candidate.passwordHash
    ) {
      throw new AuthenticationRequiredError('Invalid credentials.');
    }

    if (candidate.activeMemberships.length === 0) {
      throw new BusinessRuleError('NO_ACTIVE_SCHOOL_MEMBERSHIP', 'No active school membership is available.');
    }

    if (!input.schoolId && candidate.activeMemberships.length > 1) {
      return this.createSchoolSelection(candidate.id, candidate.activeMemberships);
    }

    const membership = this.resolveMembership(candidate.activeMemberships, input.schoolId);
    const roles = membership.roles.map((role) => role.key).sort();
    const allowedScopes = this.serviceAccessPolicy.scopesForRoles(roles);

    if (allowedScopes.length === 0) {
      throw new BusinessRuleError('SERVICE_ACCESS_DENIED', 'This account cannot access any IsKool service for the selected school.');
    }

    const refresh = this.refreshTokenService.generate();
    const now = Date.now();
    const session = await this.repository.createSession({
      userId: candidate.id,
      schoolId: membership.schoolId,
      membershipId: membership.id,
      allowedScopes,
      sessionExpiresAt: new Date(now + this.config.refreshTtlSeconds * 1000),
      refreshTokenDigest: refresh.digest,
      refreshTokenExpiresAt: new Date(now + this.config.refreshTtlSeconds * 1000)
    });

    const accessTokens = await this.signAllowedAccessTokens({
      userId: candidate.id,
      schoolId: membership.schoolId,
      membershipId: membership.id,
      sessionId: session.sessionId,
      roles,
      allowedScopes
    });

    return {
      user: {
        id: candidate.id,
        email: candidate.email,
        displayName: candidate.displayName
      },
      school: {
        id: membership.schoolId,
        name: membership.schoolName
      },
      membershipId: membership.id,
      roles,
      allowedScopes,
      accessTokens,
      refreshToken: refresh.token
    };
  }

  async refresh(input: RefreshDto): Promise<RefreshResponse> {
    const refresh = this.refreshTokenService.generate();
    const rotated = await this.repository.rotateRefreshToken({
      tokenDigest: this.refreshTokenService.digest(input.refreshToken),
      successorDigest: refresh.digest,
      refreshTokenExpiresAt: new Date(Date.now() + this.config.refreshTtlSeconds * 1000)
    });

    if (!rotated || rotated === 'reused' || rotated.allowedScopes.length === 0) {
      throw new AuthenticationRequiredError('Invalid refresh session.');
    }

    const accessTokens = await this.signAllowedAccessTokens({
      userId: rotated.userId,
      schoolId: rotated.schoolId,
      membershipId: rotated.membershipId,
      sessionId: rotated.sessionId,
      roles: rotated.roles,
      allowedScopes: rotated.allowedScopes
    });

    return {
      accessToken: accessTokens.sams ?? accessTokens.aps,
      accessTokens,
      refreshToken: refresh.token
    };
  }

  async logout(sessionId: string): Promise<{ status: 'LOGGED_OUT' }> {
    await this.repository.revokeSession(sessionId, 'logout');
    return { status: 'LOGGED_OUT' };
  }

  async context(principal: AuthPrincipal): Promise<AuthSessionContext> {
    const context = await this.repository.findSessionContext(principal);
    if (!context) {
      throw new AuthenticationRequiredError();
    }
    return context;
  }
  async schoolLogo(principal: AuthPrincipal) {
    const logo = await this.repository.schoolLogo(principal);
    if (!logo) throw new ResourceNotFoundError('No logo has been saved for your school.');
    return logo;
  }

  private resolveMembership(memberships: readonly ActiveMembership[], schoolId?: string): ActiveMembership {
    if (!schoolId) {
      return memberships[0];
    }

    const membership = memberships.find((item) => item.schoolId === schoolId);
    if (!membership) {
      throw new BusinessRuleError('SCHOOL_CONTEXT_DENIED', 'The selected school is not available for this account.');
    }
    return membership;
  }

  private async createSchoolSelection(
    userId: string,
    memberships: readonly ActiveMembership[]
  ): Promise<SchoolSelectionResponse> {
    const continuation = this.refreshTokenService.generate();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.repository.createLoginContinuation({
      userId,
      verifierDigest: continuation.digest,
      expiresAt
    });

    return {
      status: 'SCHOOL_SELECTION_REQUIRED',
      continuationToken: continuation.token,
      expiresAt: expiresAt.toISOString(),
      schools: memberships.map((membership) => {
        const roles = membership.roles.map((role) => role.key).sort();
        return {
          id: membership.schoolId,
          name: membership.schoolName,
          roles,
          allowedScopes: this.serviceAccessPolicy.scopesForRoles(roles)
        };
      })
    };
  }

  private async signAllowedAccessTokens(input: {
    userId: string;
    schoolId: string;
    membershipId: string;
    sessionId: string;
    roles: readonly string[];
    allowedScopes: readonly ('aps' | 'sams')[];
  }): Promise<Partial<Record<'aps' | 'sams', string>>> {
    const accessTokens: Partial<Record<'aps' | 'sams', string>> = {};
    for (const scope of input.allowedScopes) {
      const signed = await this.tokenServices[scope].signAccessToken({
        userId: input.userId,
        schoolId: input.schoolId,
        membershipId: input.membershipId,
        sessionId: input.sessionId,
        scope,
        roles: input.roles
      });
      accessTokens[scope] = signed.token;
    }
    return accessTokens;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requireConfig(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}
