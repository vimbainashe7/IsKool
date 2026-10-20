import { Injectable } from '@nestjs/common';
import { AuthPrincipal, ServiceScope } from '@aps-sams/auth';
import { AuthPrismaService } from './auth-prisma.service';
const schoolIdentity = {id:true,name:true,status:true,logoPresent:true,brandingVersion:true} as const;
import { AuthSessionContext, IssuedAuthSession, LoginCandidate, RotatedRefreshSession } from './auth.types';

@Injectable()
export class AuthRepository {
  async schoolLogo(p: AuthPrincipal): Promise<Buffer|null> {
    const school = await this.prisma.school.findFirst({where:{id:p.schoolId,status:'active'},select:{logoDataUrl:true}});
    return school?.logoDataUrl ? Buffer.from(school.logoDataUrl.split(',')[1],'base64') : null;
  }
  constructor(private readonly prisma: AuthPrismaService) {}

  async findLoginCandidate(emailNormalized: string): Promise<LoginCandidate | null> {
    const user = await this.prisma.user.findUnique({
      where: { emailNormalized },
      include: {
        credential: true,
        memberships: {
          where: {
            status: 'active',
            school: { status: 'active' }
          },
          include: {
            school: {select:schoolIdentity},
            membershipRoles: {
              include: { role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      passwordHash: user.credential?.passwordHash ?? null,
      credentialDisabledAt: user.credential?.disabledAt ?? null,
      activeMemberships: user.memberships.map((membership) => ({
        id: membership.id,
        schoolId: membership.schoolId,
        schoolName: membership.school.name,
        roles: membership.membershipRoles.map((membershipRole) => ({ key: membershipRole.role.key }))
      }))
    };
  }

  async createLoginContinuation(input: {
    userId: string;
    verifierDigest: string;
    expiresAt: Date;
  }): Promise<{ id: string; expiresAt: Date }> {
    const continuation = await this.prisma.authLoginContinuation.create({
      data: input,
      select: { id: true, expiresAt: true }
    });

    return continuation;
  }

  async createSession(input: {
    userId: string;
    schoolId: string;
    membershipId: string;
    allowedScopes: readonly ServiceScope[];
    sessionExpiresAt: Date;
    refreshTokenDigest: string;
    refreshTokenExpiresAt: Date;
  }): Promise<IssuedAuthSession> {
    const session = await this.prisma.authSession.create({
      data: {
        userId: input.userId,
        schoolId: input.schoolId,
        membershipId: input.membershipId,
        allowedScopes: [...input.allowedScopes],
        expiresAt: input.sessionExpiresAt,
        refreshTokens: {
          create: {
            tokenDigest: input.refreshTokenDigest,
            expiresAt: input.refreshTokenExpiresAt
          }
        }
      },
      select: {
        id: true,
        refreshTokens: {
          select: { id: true },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return {
      sessionId: session.id,
      refreshToken: '',
      refreshTokenId: session.refreshTokens[0]?.id ?? ''
    };
  }

  async validatePrincipal(input: AuthPrincipal): Promise<AuthPrincipal | null> {
    const session = await this.prisma.authSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
        schoolId: input.schoolId,
        membershipId: input.membershipId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: true,
        membership: {
          include: {
            school: {select:schoolIdentity},
            membershipRoles: {
              include: { role: true }
            }
          }
        }
      }
    });

    if (
      !session ||
      session.user.status !== 'active' ||
      session.membership.status !== 'active' ||
      session.membership.school.status !== 'active' ||
      session.membership.userId !== input.userId ||
      session.membership.schoolId !== input.schoolId ||
      !session.allowedScopes.includes(input.scope)
    ) {
      return null;
    }

    return {
      ...input,
      roles: session.membership.membershipRoles.map((membershipRole) => membershipRole.role.key).sort()
    };
  }

  async findSessionContext(input: AuthPrincipal): Promise<AuthSessionContext | null> {
    const session = await this.prisma.authSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
        schoolId: input.schoolId,
        membershipId: input.membershipId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: true,
        membership: {
          include: {
            school: {select:schoolIdentity},
            membershipRoles: { include: { role: true } }
          }
        }
      }
    });

    if (
      !session ||
      session.user.status !== 'active' ||
      session.membership.status !== 'active' ||
      session.membership.school.status !== 'active'
    ) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName
      },
      school: {
        id: session.membership.school.id,
        name: session.membership.school.name,
        ...(session.membership.school.logoPresent ? {logoUrl:`/api/school-logo?v=${session.membership.school.brandingVersion}`} : {})
      },
      membershipId: session.membership.id,
      roles: session.membership.membershipRoles.map((membershipRole) => membershipRole.role.key).sort()
    };
  }

  async rotateRefreshToken(input: {
    tokenDigest: string;
    successorDigest: string;
    refreshTokenExpiresAt: Date;
  }): Promise<RotatedRefreshSession | 'reused' | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          id: string;
          session_id: string;
          consumed_at: Date | null;
          revoked_at: Date | null;
          expires_at: Date;
        }[]
      >`
        SELECT id, session_id, consumed_at, revoked_at, expires_at
        FROM public.auth_refresh_tokens
        WHERE token_digest = ${input.tokenDigest}
        FOR UPDATE
      `;

      const token = rows[0];
      if (!token) {
        return null;
      }

      if (token.consumed_at) {
        await tx.authSession.update({
          where: { id: token.session_id },
          data: { revokedAt: new Date(), reuseDetectedAt: new Date(), revokeReason: 'refresh_reuse' }
        });
        await tx.authRefreshToken.update({
          where: { id: token.id },
          data: { reuseDetectedAt: new Date() }
        });
        return 'reused';
      }

      if (token.revoked_at || token.expires_at <= new Date()) {
        return null;
      }

      const session = await tx.authSession.findUnique({
        where: { id: token.session_id },
        include: {
          user: true,
          membership: {
            include: {
            school: {select:schoolIdentity},
              membershipRoles: { include: { role: true } }
            }
          }
        }
      });

      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.user.status !== 'active' ||
        session.membership.status !== 'active' ||
        session.membership.school.status !== 'active'
      ) {
        return null;
      }

      const successor = await tx.authRefreshToken.create({
        data: {
          sessionId: session.id,
          tokenDigest: input.successorDigest,
          expiresAt: input.refreshTokenExpiresAt
        },
        select: { id: true }
      });

      await tx.authRefreshToken.update({
        where: { id: token.id },
        data: {
          consumedAt: new Date(),
          replacedById: successor.id
        }
      });

      await tx.authSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() }
      });

      return {
        sessionId: session.id,
        userId: session.userId,
        schoolId: session.schoolId,
        membershipId: session.membershipId,
        roles: session.membership.membershipRoles.map((membershipRole) => membershipRole.role.key).sort(),
        allowedScopes: session.allowedScopes.filter((scope): scope is ServiceScope => scope === 'aps' || scope === 'sams')
      };
    });
  }

  async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokeReason: reason }
    });
  }
}
