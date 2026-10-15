import { randomUUID } from 'node:crypto';
import { createPrisma } from './helpers/db.mjs';
import { loadServiceEnv } from './helpers/env.mjs';

loadServiceEnv('sams-api');

const prisma = await createPrisma(process.env.DATABASE_URL);
const authPrisma = await createPrisma(process.env.AUTH_DATABASE_URL);
const requestId = `m2-audit-${randomUUID()}`;

try {
  const admin = await authPrisma.user.findUnique({
    where: { emailNormalized: 'admin.alpha@example.test' },
    include: {
      memberships: {
        where: { school: { name: 'School Alpha' } },
        include: { school: true }
      }
    }
  });

  const membership = admin?.memberships[0];
  if (!admin || !membership) {
    throw new Error('Seeded admin.alpha@example.test membership in School Alpha is required.');
  }

  const event = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT
        set_config('iskool.user_id', ${admin.id}, true),
        set_config('iskool.school_id', ${membership.schoolId}, true),
        set_config('iskool.membership_id', ${membership.id}, true),
        set_config('iskool.request_id', ${requestId}, true)
    `;

    return tx.auditEvent.create({
      data: {
        actorUserId: admin.id,
        actorMembershipId: membership.id,
        schoolId: membership.schoolId,
        action: 'm2.acceptance.audit',
        entityType: 'acceptance_probe',
        entityId: requestId,
        beforeValue: { status: 'before' },
        afterValue: { status: 'after' },
        requestId,
        reason: 'M2 audit smoke'
      },
      select: {
        id: true,
        actorUserId: true,
        actorMembershipId: true,
        schoolId: true,
        action: true,
        entityType: true,
        entityId: true,
        requestId: true,
        createdAt: true
      }
    });
  });

  console.log('PASS audit transaction-local write');
  console.log(
    JSON.stringify(
      {
        id: event.id,
        actorUserId: event.actorUserId,
        actorMembershipId: event.actorMembershipId,
        schoolId: event.schoolId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        requestId: event.requestId,
        createdAt: event.createdAt
      },
      null,
      2
    )
  );
} finally {
  await Promise.all([prisma.$disconnect(), authPrisma.$disconnect()]);
}
