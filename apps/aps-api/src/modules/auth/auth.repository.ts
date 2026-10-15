import { Injectable } from '@nestjs/common';
import { AuthPrincipal } from '@aps-sams/auth';
import { AuthPrismaService } from './auth-prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: AuthPrismaService) {}

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
            school: true,
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

  async findSessionContext(input: AuthPrincipal) {
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
            school: true,
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
        name: session.membership.school.name
      },
      membershipId: session.membership.id,
      roles: session.membership.membershipRoles.map((membershipRole) => membershipRole.role.key).sort()
    };
  }

  async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokeReason: reason }
    });
  }
}
