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
}
